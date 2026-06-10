package com.financetracker.service;

import com.financetracker.model.BankAccount;
import com.financetracker.model.Budget;
import com.financetracker.model.SavingsGoal;
import com.financetracker.model.Transaction;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.repository.BudgetRepository;

import com.financetracker.repository.TransactionRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleObjectStateException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
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
    private final SavingsGoalService savingsGoalService;

    @Lazy
    @Autowired
    private TransactionService self;

    private static final int MAX_OPTIMISTIC_RETRIES = 3;

    // Phase5.0005: hard cap on any single transaction amount. Defends against a
    // client PUT that drives an account to ±10**8 silently. Per-currency caps
    // could be added later but a coarse global ceiling is the right MVP.
    private static final BigDecimal MAX_TX_AMOUNT = new BigDecimal("1000000.00");

    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(String userId) {
        // ISSUE 4.047 FIX: Sort by date at the DB level for consistent, performant listing.
        return repo.findAllByUserIdOrderByTransactionDateDesc(userId);
    }

    // FLAW #1 FIX: UUID-based IDs + idempotency key deduplication
    // FLAW #3 FIX: REPEATABLE_READ isolation prevents dirty/non-repeatable reads
    //              across the balance + budget + savings delta chain
    @Transactional
    public Transaction create(Transaction tx) {
        if (tx.getAmount() == null || tx.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount must be positive");
        }
        if (tx.getAmount().compareTo(MAX_TX_AMOUNT) > 0) {
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
        // ISSUE 4.048 FIX: Strictly sync currency from BankAccount to prevent ledger drift.
        // If account is specified, the transaction MUST inherit that account's currency.
        if (tx.getAccount() != null && !tx.getAccount().isBlank() && tx.getUserId() != null) {
            java.util.Optional<com.financetracker.model.BankAccount> optBank = bankRepo.findById(tx.getAccount());
            if (optBank.isEmpty() && !tx.getAccount().matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
                optBank = bankRepo.findByNameIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId());
            }
            optBank.ifPresent(bank -> {
                tx.setCurrency(bank.getCurrency());
                // Also ensure account name is normalized if it was a name lookup
                if (!bank.getId().equals(tx.getAccount())) {
                    tx.setAccount(bank.getId());
                }
            });
        }

        try {
            Transaction saved = repo.save(tx);
            // FLAW #6 FIX: balance update wrapped in optimistic-lock retry loop
            self.applyBalanceDeltaWithRetryInNewTransaction(saved, +1);
            applyBudgetDelta(saved, +1);
            if (saved.getSavingsGoalId() != null) {
                savingsGoalService.recalculateAndCheckCompletion(saved.getSavingsGoalId());
            }
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
        return self.doUpdate(id, updates, requestUserId);
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
        value = { ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, StaleObjectStateException.class },
        maxAttempts = MAX_OPTIMISTIC_RETRIES,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    public Transaction doUpdate(String id, Map<String, Object> updates, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);

        String oldGoalId = tx.getSavingsGoalId();
        applyBalanceDelta(tx, -1);
        applyBudgetDelta(tx, -1);

        applyUpdates(tx, updates);
        Transaction saved = repo.save(tx);

        applyBalanceDelta(saved, +1);
        applyBudgetDelta(saved, +1);

        if (oldGoalId != null) {
            savingsGoalService.recalculateAndCheckCompletion(oldGoalId);
        }
        if (saved.getSavingsGoalId() != null && !saved.getSavingsGoalId().equals(oldGoalId)) {
            savingsGoalService.recalculateAndCheckCompletion(saved.getSavingsGoalId());
        }
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
        if (amt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount must be positive");
        }
        if (amt.compareTo(MAX_TX_AMOUNT) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "amount exceeds per-transaction limit");
        }
    }

    // Phase4.0008: confidence is no longer accepted in the generic update payload.
    // User-confirmed recategorisation flips category/aiTag and sets confidence to
    // 1.00 server-side, where the value is trusted.
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Transaction recategorise(String id, String newCategory, String requestUserId) {
        // ISSUE 4.046 FIX: Consolidate updates into a single transaction/save call.
        Map<String, Object> updates = new java.util.HashMap<>();
        updates.put("category", newCategory);
        updates.put("aiTag", newCategory);
        updates.put("confidence", new BigDecimal("1.00"));
        return update(id, updates, requestUserId);
    }

    /**
     * Deletes with outer optimistic-lock retries so a failed attempt never leaves the persistence context wedged.
     * Balance deltas still commit in {@link #applyBalanceDeltaWithRetryInNewTransaction} (REQUIRES_NEW).
     */
    public void delete(String id, String requestUserId) {
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:entry", "delete requested", java.util.Map.of("id", id, "uidLen", requestUserId != null ? requestUserId.length() : -1));
        // #endregion
        self.deleteTransactionTransactionalAttempt(id, requestUserId);
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H1", "TransactionService.delete:success", "deleted", java.util.Map.of("id", id));
        // #endregion
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
        value = { ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, StaleObjectStateException.class },
        maxAttempts = MAX_OPTIMISTIC_RETRIES,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
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
        String goalId = tx.getSavingsGoalId();
        self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
        applyBudgetDelta(tx, -1);
        repo.delete(tx);
        if (goalId != null) {
            savingsGoalService.recalculateAndCheckCompletion(goalId);
        }
    }

    public int bulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        validateAmountUpdate(updates);
        return self.doBulkUpdate(ids, updates, requestUserId);
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
        value = { ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, StaleObjectStateException.class },
        maxAttempts = MAX_OPTIMISTIC_RETRIES,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    public int doBulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        java.util.Set<String> affectedGoals = new java.util.HashSet<>();
        for (Transaction tx : txs) {
            if (tx.getSavingsGoalId() != null) affectedGoals.add(tx.getSavingsGoalId());
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
            applyBudgetDelta(tx, -1);
            applyUpdates(tx, updates);
        }
        repo.saveAll(txs);
        for (Transaction tx : txs) {
            if (tx.getSavingsGoalId() != null) affectedGoals.add(tx.getSavingsGoalId());
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, +1);
            applyBudgetDelta(tx, +1);
        }
        affectedGoals.forEach(savingsGoalService::recalculateAndCheckCompletion);
        return txs.size();
    }

    public int bulkDelete(List<String> ids, String requestUserId) {
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:entry", "bulk delete", java.util.Map.of(
            "count", ids != null ? ids.size() : -1,
            "uidLen", requestUserId != null ? requestUserId.length() : -1
        ));
        // #endregion
        int n = self.bulkDeleteTransactionalAttempt(ids, requestUserId);
        // #region agent log
        com.financetracker.debug.AgentDebugLog.log("H12", "TransactionService.bulkDelete:success", "ok", java.util.Map.of("deleted", n));
        // #endregion
        return n;
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
        value = { ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, StaleObjectStateException.class },
        maxAttempts = MAX_OPTIMISTIC_RETRIES,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    public int bulkDeleteTransactionalAttempt(List<String> ids, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        java.util.Set<String> affectedGoals = new java.util.HashSet<>();
        for (Transaction tx : txs) {
            if (tx.getSavingsGoalId() != null) affectedGoals.add(tx.getSavingsGoalId());
            self.applyBalanceDeltaWithRetryInNewTransaction(tx, -1);
            applyBudgetDelta(tx, -1);
        }
        repo.deleteAll(txs);
        affectedGoals.forEach(savingsGoalService::recalculateAndCheckCompletion);
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
            // ISSUE 4.047 FIX: Use database-level exclusion query instead of fetching all transactions and filtering in-memory.
            List<Transaction> toVoid = repo.findToVoid(userId, incomingIds);
            for (Transaction t : toVoid) {
                update(t.getId(), Map.of("status", "VOIDED"), userId);
            }
        }
    }

    // FLAW #6 FIX: Optimistic lock retry wrapper for balance mutations.
    // Retries up to MAX_OPTIMISTIC_RETRIES times on concurrent write collision.
    // Balance commits independently so optimistic-lock retries are not poisoned by the enclosing TX (delete/create/bulkDelete).
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Retryable(
        value = { ObjectOptimisticLockingFailureException.class, OptimisticLockException.class, StaleObjectStateException.class },
        maxAttempts = MAX_OPTIMISTIC_RETRIES,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    public void applyBalanceDeltaWithRetryInNewTransaction(Transaction tx, int sign) {
        applyBalanceDelta(tx, sign);
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
        // ISSUE 5.001 FIX: Throw an error if account is missing instead of failing silently.
        if (tx.getAccount() == null || tx.getAccount().isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Transaction account is required for balance updates");
        }
        if (tx.getAmount() == null) return; // Non-financial transactions allowed? Usually not, but following safety.
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
        // Phase4.0007 + 0009: Assert ownership strictly so a transaction cannot
        // manipulate another user's bank balance via UUID injection.
        Guards.assertOwner(bank.getUserId(), tx.getUserId());
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
        // Phase5.0006 / ISSUE 5.009 FIX: Currency must match strictly. 
        // We now reject transactions without a currency to ensure budget accuracy.
        if (tx.getCurrency() == null || tx.getCurrency().isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Transaction currency is required for budget updates");
        }
        String txCategory = tx.getCategory().trim();
        BigDecimal abs = tx.getAmount().abs();
        BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
        LocalDate txDate = tx.getTransactionDate();
        // ISSUE 4.047 FIX: Query only budgets matching the transaction's category and currency to avoid full-user budget scans.
        List<Budget> budgets = budgetRepo.findAllByUserIdAndCategoryIgnoreCaseAndCurrencyAndDeletedFalse(
            tx.getUserId(), txCategory, tx.getCurrency());

        for (Budget b : budgets) {
            // FLAW #13 FIX: Only apply delta if tx date is within the budget's period
            if (txDate != null && b.getPeriodStart() != null && b.getPeriodEnd() != null) {
                if (txDate.isBefore(b.getPeriodStart()) || txDate.isAfter(b.getPeriodEnd())) continue;
            }
            // ISSUE 5.019 FIX: Enforce per-transaction spending limits if configured.
            if (b.getPerTransactionLimit() != null && abs.compareTo(b.getPerTransactionLimit()) > 0) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    String.format("Transaction amount %s exceeds per-transaction limit %s for budget %s",
                        abs, b.getPerTransactionLimit(), b.getCategory()));
            }
            b.applySpentDelta(delta);
            budgetRepo.save(b);
        }
    }



    private void applyUpdates(Transaction tx, Map<String, Object> updates) {
        updates.forEach((key, value) -> {
            if (value == null) return;
            switch (key) {
                case "date" -> {
                    try {
                        tx.setTransactionDate(java.time.LocalDate.parse(value.toString()));
                    } catch (java.time.format.DateTimeParseException e) {
                        throw new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.BAD_REQUEST, "invalid date format");
                    }
                }
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
                case "confidence" -> tx.setConfidence(new BigDecimal(value.toString()));
                case "savingsGoalId" -> tx.setSavingsGoalId((String) value);
                case "currency" -> tx.setCurrency((String) value);
                default -> {}
            }
        });
    }
}
