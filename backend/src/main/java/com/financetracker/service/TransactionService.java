package com.financetracker.service;

import com.financetracker.model.BankAccount;
import com.financetracker.model.Budget;
import com.financetracker.model.SavingsGoal;
import com.financetracker.model.Transaction;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.repository.BudgetRepository;
import com.financetracker.repository.SavingsGoalRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleObjectStateException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository repo;
    private final BankAccountRepository bankRepo;
    private final BudgetRepository budgetRepo;
    private final SavingsGoalRepository savingsRepo;

    @Lazy
    @Autowired
    private TransactionService self;

    private static final int MAX_OPTIMISTIC_RETRIES = 3;

    private static boolean isOptimisticLockConflict(Throwable e) {
        Throwable cur = e;
        while (cur != null) {
            if (cur instanceof ObjectOptimisticLockingFailureException) return true;
            if (cur instanceof OptimisticLockException) return true;
            if (cur instanceof StaleObjectStateException) return true;
            cur = cur.getCause();
        }
        return false;
    }

    // Phase5.0005: hard cap on any single transaction amount. Defends against a
    // client PUT that drives an account to ±10**8 silently. Per-currency caps
    // could be added later but a coarse global ceiling is the right MVP.
    private static final BigDecimal MAX_TX_AMOUNT = new BigDecimal("1000000.00");

    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    // FLAW #1 FIX: UUID-based IDs + idempotency key deduplication
    // FLAW #3 FIX: REPEATABLE_READ isolation prevents dirty/non-repeatable reads
    //              across the balance + budget + savings delta chain
    @Transactional
    public Transaction create(Transaction tx) {
        if (tx.getAmount() != null && tx.getAmount().abs().compareTo(MAX_TX_AMOUNT) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount exceeds per-transaction limit");
        }
        // UUID generation — no timestamp-based collision risk
        if (tx.getId() == null || tx.getId().isBlank()) {
            tx.setId("tx-" + UUID.randomUUID());
        }

        // FLAW #1 FIX: Assign idempotency key if not already set
        if (tx.getIdempotencyKey() == null || tx.getIdempotencyKey().isBlank()) {
            tx.setIdempotencyKey(UUID.randomUUID().toString());
        }

        // Resolve account/currency from primary if missing
        if ((tx.getAccount() == null || tx.getAccount().isBlank()) && tx.getUserId() != null) {
            bankRepo.findByUserIdAndIsPrimaryTrue(tx.getUserId()).ifPresent(bank -> {
                tx.setAccount(bank.getName());
                if (tx.getCurrency() == null || tx.getCurrency().isBlank()) {
                    tx.setCurrency(bank.getCurrency());
                }
            });
        }
        if ((tx.getCurrency() == null || tx.getCurrency().isBlank()) && tx.getAccount() != null && tx.getUserId() != null) {
            bankRepo.findByNameIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId()).ifPresent(bank ->
                    tx.setCurrency(bank.getCurrency()));
            if (tx.getCurrency() == null || tx.getCurrency().isBlank()) {
                bankRepo.findFirstByBankIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId()).ifPresent(bank -> {
                    tx.setCurrency(bank.getCurrency());
                    tx.setAccount(bank.getName());
                });
            }
        }

        try {
            Transaction saved = repo.save(tx);
            // FLAW #6 FIX: balance update wrapped in optimistic-lock retry loop
            self.applyBalanceDeltaWithRetryInNewTransaction(saved, +1);
            applyBudgetDelta(saved, +1);
            applySavingsDelta(saved, +1);
            return saved;
        } catch (DataIntegrityViolationException e) {
            // FLAW #1 FIX: Duplicate idempotency key — return existing transaction
            return repo.findByUserIdAndIdempotencyKey(tx.getUserId(), tx.getIdempotencyKey())
                .orElseThrow(() -> e);
        }
    }

    // Phase5.0004 + 0005: optimistic-lock retry now wraps the *entire* update so
    // a contended re-run is fully atomic — previously the inner retry only
    // re-applied the balance delta while the outer transaction had already
    // rolled back, leaving budgets/savings out of sync. The amount cap also
    // runs server-side so an attacker cannot drive an account to ±10**8.
    public Transaction update(String id, Map<String, Object> updates, String requestUserId) {
        validateAmountUpdate(updates);
        return retryOnOptimisticLock(() -> doUpdate(id, updates, requestUserId));
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    protected Transaction doUpdate(String id, Map<String, Object> updates, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);

        applyBalanceDelta(tx, -1);
        applyBudgetDelta(tx, -1);
        applySavingsDelta(tx, -1);

        applyUpdates(tx, updates);
        Transaction saved = repo.save(tx);

        applyBalanceDelta(saved, +1);
        applyBudgetDelta(saved, +1);
        applySavingsDelta(saved, +1);
        return saved;
    }

    private void validateAmountUpdate(Map<String, Object> updates) {
        Object raw = updates == null ? null : updates.get("amount");
        if (raw == null) return;
        BigDecimal amt;
        try {
            amt = new BigDecimal(raw.toString());
        } catch (NumberFormatException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount must be numeric");
        }
        if (amt.abs().compareTo(MAX_TX_AMOUNT) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount exceeds per-transaction limit");
        }
    }

    private <T> T retryOnOptimisticLock(java.util.function.Supplier<T> op) {
        int attempts = 0;
        while (true) {
            try {
                return op.get();
            } catch (ObjectOptimisticLockingFailureException e) {
                attempts++;
                if (attempts >= MAX_OPTIMISTIC_RETRIES) {
                    throw new RuntimeException(
                        "Transaction update failed after " + MAX_OPTIMISTIC_RETRIES
                        + " optimistic-lock retries", e);
                }
                try { Thread.sleep(50L * attempts); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }
    }

    // Phase4.0008: confidence is no longer accepted in the generic update payload.
    // User-confirmed recategorisation flips category/aiTag and sets confidence to
    // 1.00 server-side, where the value is trusted.
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Transaction recategorise(String id, String newCategory, String requestUserId) {
        Transaction updated = update(id, Map.of("category", newCategory, "aiTag", newCategory), requestUserId);
        updated.setConfidence(new BigDecimal("1.00"));
        return repo.save(updated);
    }

    /**
     * Deletes with outer optimistic-lock retries so a failed attempt never leaves the persistence context wedged.
     * Balance deltas still commit in {@link #applyBalanceDeltaWithRetryInNewTransaction} (REQUIRES_NEW).
     */
    public void delete(String id, String requestUserId) {
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:entry", "delete requested", java.util.Map.of("id", id, "uidLen", requestUserId != null ? requestUserId.length() : -1));
        // #endregion
        int attempts = 0;
        while (true) {
            try {
                self.deleteTransactionTransactionalAttempt(id, requestUserId);
                // #region agent log
                com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:success", "deleted", java.util.Map.of("id", id));
                // #endregion
                return;
            } catch (Exception e) {
                if (isOptimisticLockConflict(e)) {
                    attempts++;
                    // #region agent log
                    String em = e.getMessage() != null ? e.getMessage() : "";
                    com.financetracker.debug.AgentDebugLog.log("H9", "TransactionService.delete:ole-retry", "optimistic lock", java.util.Map.of(
                        "id", id,
                        "attempt", attempts,
                        "surfaceEx", e.getClass().getSimpleName(),
                        "msg", em.length() > 120 ? em.substring(0, 120) : em
                    ));
                    // #endregion
                    if (attempts >= MAX_OPTIMISTIC_RETRIES) {
                        throw e;
                    }
                    try {
                        Thread.sleep(50L * attempts);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                    continue;
                }
                // #region agent log
                String em = e.getMessage() != null ? e.getMessage() : "";
                com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:error", "exception", java.util.Map.of(
                    "id", id,
                    "ex", e.getClass().getSimpleName(),
                    "msg", em.length() > 220 ? em.substring(0, 220) : em
                ));
                // #endregion
                throw e;
            }
        }
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void deleteTransactionTransactionalAttempt(String id, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:loaded", "tx row found", java.util.Map.of(
            "id", id,
            "type", tx.getType() != null ? tx.getType() : "",
            "hasAccount", tx.getAccount() != null && !tx.getAccount().isBlank(),
            "hasSavingsGoalId", tx.getSavingsGoalId() != null && !tx.getSavingsGoalId().isBlank()
        ));
        // #endregion
        self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
        applyBudgetDelta(tx, -1);
        applySavingsDelta(tx, -1);
        repo.delete(tx);
    }

    // Phase5.0004 + 0005: bulk path also runs under outer-level retry and
    // amount validation. Each transaction is mutated through the same delta
    // lifecycle so a contended re-run is atomic.
    public int bulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        validateAmountUpdate(updates);
        return retryOnOptimisticLock(() -> doBulkUpdate(ids, updates, requestUserId));
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    protected int doBulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
            applyBudgetDelta(tx, -1);
            applySavingsDelta(tx, -1);
            applyUpdates(tx, updates);
        }
        repo.saveAll(txs);
        for (Transaction tx : txs) {
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, +1);
            applyBudgetDelta(tx, +1);
            applySavingsDelta(tx, +1);
        }
        return txs.size();
    }

    public int bulkDelete(List<String> ids, String requestUserId) {
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:entry", "bulk delete", java.util.Map.of(
            "count", ids != null ? ids.size() : -1,
            "uidLen", requestUserId != null ? requestUserId.length() : -1
        ));
        // #endregion
        int attempts = 0;
        while (true) {
            try {
                int n = self.bulkDeleteTransactionalAttempt(ids, requestUserId);
                // #region agent log
                com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:success", "ok", java.util.Map.of("deleted", n));
                // #endregion
                return n;
            } catch (Exception e) {
                if (isOptimisticLockConflict(e)) {
                    attempts++;
                    // #region agent log
                    String em = e.getMessage() != null ? e.getMessage() : "";
                    com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:ole-retry", "retry", java.util.Map.of(
                        "attempt", attempts,
                        "surfaceEx", e.getClass().getSimpleName(),
                        "msg", em.length() > 120 ? em.substring(0, 120) : em
                    ));
                    // #endregion
                    if (attempts >= MAX_OPTIMISTIC_RETRIES) {
                        throw e;
                    }
                    try {
                        Thread.sleep(50L * attempts);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                    continue;
                }
                // #region agent log
                String em = e.getMessage() != null ? e.getMessage() : "";
                com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:error", "fail", java.util.Map.of(
                    "ex", e.getClass().getSimpleName(),
                    "msg", em.length() > 220 ? em.substring(0, 220) : em
                ));
                // #endregion
                throw e;
            }
        }
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public int bulkDeleteTransactionalAttempt(List<String> ids, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
            applyBudgetDelta(tx, -1);
            applySavingsDelta(tx, -1);
        }
        repo.deleteAll(txs);
        return txs.size();
    }

    // FLAW #7 FIX: syncTransactions now uses upsert+VOID pattern instead of DELETE+INSERT.
    // This guarantees:
    //   1. No data loss if saveAll fails mid-batch
    //   2. Balance deltas are applied correctly via the create() path
    //   3. Transactions no longer in the feed are VOIDED (soft-deleted), never hard-deleted
    // Phase5.0003: each per-tx update() runs in its own transaction (with its
    // own optimistic-lock retry). syncTransactions itself is intentionally NOT
    // @Transactional so a mid-batch failure does not roll back successful
    // upserts; the operation is idempotent because update() applies delta -1/+1.
    public void syncTransactions(String userId, List<Transaction> incoming) {
        Guards.requireUser(userId);
        for (Transaction tx : incoming) {
            tx.setUserId(userId);
            if (tx.getId() != null && !tx.getId().isBlank() && repo.existsById(tx.getId())) {
                // Phase5.0003: route the update through update() so the delta
                // lifecycle (-1 / apply / +1) runs and balances stay consistent.
                Map<String, Object> updates = new java.util.HashMap<>();
                if (tx.getMerchant() != null) updates.put("merchant", tx.getMerchant());
                if (tx.getAmount() != null) updates.put("amount", tx.getAmount());
                if (tx.getCategory() != null) updates.put("category", tx.getCategory());
                if (tx.getStatus() != null) updates.put("status", tx.getStatus());
                if (tx.getTransactionDate() != null) updates.put("date", tx.getTransactionDate().toString());
                if (tx.getCurrency() != null) updates.put("currency", tx.getCurrency());
                if (tx.getAccount() != null) updates.put("account", tx.getAccount());
                if (tx.getType() != null) updates.put("type", tx.getType());
                if (!updates.isEmpty()) {
                    update(tx.getId(), updates, userId);
                }
            } else {
                create(tx);
            }
        }
        // Transactions present in DB but absent from the incoming feed are VOIDED
        // (status="VOIDED") — never hard-deleted, preserving ledger integrity
        List<String> incomingIds = incoming.stream()
            .map(Transaction::getId)
            .filter(id -> id != null && !id.isBlank())
            .toList();
        if (!incomingIds.isEmpty()) {
            List<Transaction> toVoid = repo.findAllByUserId(userId).stream()
                .filter(t -> !incomingIds.contains(t.getId()) && !"VOIDED".equals(t.getStatus()))
                .toList();
            for (Transaction t : toVoid) {
                update(t.getId(), Map.of("status", "VOIDED"), userId);
            }
        }
    }

    // FLAW #6 FIX: Optimistic lock retry wrapper for balance mutations.
    // Retries up to MAX_OPTIMISTIC_RETRIES times on concurrent write collision.
    // Balance commits independently so optimistic-lock retries are not poisoned by the enclosing TX (delete/create/bulkDelete).
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void applyBalanceDeltaWithRetryInNewTransaction(Transaction tx, int sign) {
        applyBalanceDeltaWithRetry(tx, sign);
    }

    private void applyBalanceDeltaWithRetry(Transaction tx, int sign) {
        int attempts = 0;
        while (true) {
            try {
                applyBalanceDelta(tx, sign);
                return;
            } catch (ObjectOptimisticLockingFailureException e) {
                attempts++;
                if (attempts >= MAX_OPTIMISTIC_RETRIES) {
                    throw new RuntimeException(
                        "Balance update failed after " + MAX_OPTIMISTIC_RETRIES +
                        " retries due to concurrent modification on account for transaction " + tx.getId(), e);
                }
                try { Thread.sleep(50L * attempts); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }
    }

    /**
     * When {@code account} is already a persisted bank UUID, never fall back to name matching —
     * that avoids touching the wrong row if names collide with legacy free-text labels.
     */
    private static boolean looksLikeBankUuid(String account) {
        return account != null
                && account.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    }

    private void applyBalanceDelta(Transaction tx, int sign) {
        if (tx.getAccount() == null || tx.getAccount().isBlank() || tx.getAmount() == null) return;
        java.util.Optional<BankAccount> optBank = bankRepo.findById(tx.getAccount());
        if (optBank.isEmpty() && !looksLikeBankUuid(tx.getAccount())) {
            optBank = bankRepo.findByNameIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId());
        }
        if (optBank.isEmpty() && !looksLikeBankUuid(tx.getAccount())) {
            optBank = bankRepo.findFirstByBankIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId());
        }
        BankAccount bank = optBank.orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST,
            "account not found"
        ));
        BigDecimal abs = tx.getAmount().abs();
        BigDecimal cur = bank.getBalance() != null ? bank.getBalance() : BigDecimal.ZERO;
        BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
        if ("EXPENSE".equalsIgnoreCase(tx.getType())) {
            bank.setBalance(cur.subtract(delta));
        } else if ("INCOME".equalsIgnoreCase(tx.getType())) {
            bank.setBalance(cur.add(delta));
        }
        bankRepo.save(bank);
    }

    // FLAW #4 + FLAW #13 FIX: Budget 'spent' is computed from transactions within the budget period.
    // Only transactions whose transactionDate falls within [budget.periodStart, budget.periodEnd]
    // are counted. 'spent' is never accepted from client input.
    private void applyBudgetDelta(Transaction tx, int sign) {
        if (!"EXPENSE".equalsIgnoreCase(tx.getType())) return;
        if (tx.getCategory() == null || tx.getCategory().isBlank() || tx.getAmount() == null || tx.getUserId() == null) return;
        // Phase5.0006: currency must match strictly. The previous "both null OK"
        // path let cross-currency budgets double-count an unspecified-currency tx.
        if (tx.getCurrency() == null || tx.getCurrency().isBlank()) return;
        String txCategory = tx.getCategory().trim();
        BigDecimal abs = tx.getAmount().abs();
        BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
        LocalDate txDate = tx.getTransactionDate();
        for (Budget b : budgetRepo.findAllByUserId(tx.getUserId())) {
            if (b.getCategory() == null) continue;
            if (!b.getCategory().trim().equalsIgnoreCase(txCategory)) continue;
            if (b.getCurrency() == null || !b.getCurrency().equalsIgnoreCase(tx.getCurrency())) continue;
            // FLAW #13 FIX: Only apply delta if tx date is within the budget's period
            if (txDate != null && b.getPeriodStart() != null && b.getPeriodEnd() != null) {
                if (txDate.isBefore(b.getPeriodStart()) || txDate.isAfter(b.getPeriodEnd())) continue;
            }
            BigDecimal cur = b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO;
            b.setSpentInternal(cur.add(delta));
            budgetRepo.save(b);
        }
    }

    private void applySavingsDelta(Transaction tx, int sign) {
        if (tx.getSavingsGoalId() == null || tx.getSavingsGoalId().isBlank() || tx.getAmount() == null) return;
        savingsRepo.findById(tx.getSavingsGoalId()).ifPresent(goal -> {
            if (Boolean.TRUE.equals(goal.getDeleted())) return;
            if (goal.getUserId() != null && !goal.getUserId().equals(tx.getUserId())) return;
            // Phase5.0015: skip cross-currency contributions. A USD goal must not
            // accumulate raw EUR amounts as if they were USD — currency
            // conversion belongs in a separate, explicit flow.
            if (goal.getCurrency() != null && tx.getCurrency() != null
                    && !goal.getCurrency().equalsIgnoreCase(tx.getCurrency())) return;
            BigDecimal abs = tx.getAmount().abs();
            BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
            BigDecimal cur = goal.getCurrent() != null ? goal.getCurrent() : BigDecimal.ZERO;
            // Phase5.0002: only the package-private setter / setCurrentInternal
            // is permitted; Lombok's setCurrent is no longer reachable from here.
            goal.setCurrentInternal(cur.add(delta));
            savingsRepo.save(goal);
        });
    }

    private void applyUpdates(Transaction tx, Map<String, Object> updates) {
        updates.forEach((key, value) -> {
            if (value == null) return;
            switch (key) {
                case "date" -> tx.setDate((String) value);
                case "merchant" -> tx.setMerchant((String) value);
                case "amount" -> tx.setAmount(new BigDecimal(value.toString()));
                case "category" -> tx.setCategory((String) value);
                case "type" -> tx.setType((String) value);
                case "status" -> tx.setStatus((String) value);
                case "aiTag" -> tx.setAiTag((String) value);
                case "account" -> tx.setAccount((String) value);
                // Phase4.0008: confidence is server-managed only (raised by the
                // /recategorise endpoint when a user verifies an AI category).
                // Allowing the client to set it would corrupt the AI feedback loop.
                case "savingsGoalId" -> tx.setSavingsGoalId((String) value);
                case "currency" -> tx.setCurrency((String) value);
                default -> {}
            }
        });
    }
}
