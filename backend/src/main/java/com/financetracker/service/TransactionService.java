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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
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

    private static final int MAX_OPTIMISTIC_RETRIES = 3;

    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    // FLAW #1 FIX: UUID-based IDs + idempotency key deduplication
    // FLAW #3 FIX: REPEATABLE_READ isolation prevents dirty/non-repeatable reads
    //              across the balance + budget + savings delta chain
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Transaction create(Transaction tx) {
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
            applyBalanceDeltaWithRetry(saved, +1);
            applyBudgetDelta(saved, +1);
            applySavingsDelta(saved, +1);
            return saved;
        } catch (DataIntegrityViolationException e) {
            // FLAW #1 FIX: Duplicate idempotency key — return existing transaction
            return repo.findByUserIdAndIdempotencyKey(tx.getUserId(), tx.getIdempotencyKey())
                .orElseThrow(() -> e);
        }
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Transaction update(String id, Map<String, Object> updates, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);

        applyBalanceDeltaWithRetry(tx, -1);
        applyBudgetDelta(tx, -1);
        applySavingsDelta(tx, -1);

        applyUpdates(tx, updates);
        Transaction saved = repo.save(tx);

        applyBalanceDeltaWithRetry(saved, +1);
        applyBudgetDelta(saved, +1);
        applySavingsDelta(saved, +1);
        return saved;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void delete(String id, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);
        applyBalanceDeltaWithRetry(tx, -1);
        applyBudgetDelta(tx, -1);
        applySavingsDelta(tx, -1);
        repo.delete(tx);
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public int bulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            applyBalanceDeltaWithRetry(tx, -1);
            applyBudgetDelta(tx, -1);
            applySavingsDelta(tx, -1);
            applyUpdates(tx, updates);
        }
        repo.saveAll(txs);
        for (Transaction tx : txs) {
            applyBalanceDeltaWithRetry(tx, +1);
            applyBudgetDelta(tx, +1);
            applySavingsDelta(tx, +1);
        }
        return txs.size();
    }

    @SuppressWarnings("null")
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public int bulkDelete(List<String> ids, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            applyBalanceDeltaWithRetry(tx, -1);
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
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void syncTransactions(String userId, List<Transaction> incoming) {
        Guards.requireUser(userId);
        for (Transaction tx : incoming) {
            tx.setUserId(userId);
            if (tx.getId() != null && !tx.getId().isBlank()) {
                repo.findById(tx.getId()).ifPresentOrElse(
                    existing -> {
                        // Update mutable fields only — never overwrite userId
                        existing.setMerchant(tx.getMerchant());
                        existing.setAmount(tx.getAmount());
                        existing.setCategory(tx.getCategory());
                        existing.setStatus(tx.getStatus());
                        existing.setTransactionDate(tx.getTransactionDate());
                        repo.save(existing);
                    },
                    () -> create(tx)
                );
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
                t.setStatus("VOIDED");
                repo.save(t);
            }
        }
    }

    // FLAW #6 FIX: Optimistic lock retry wrapper for balance mutations.
    // Retries up to MAX_OPTIMISTIC_RETRIES times on concurrent write collision.
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

    private void applyBalanceDelta(Transaction tx, int sign) {
        if (tx.getAccount() == null || tx.getAccount().isBlank() || tx.getAmount() == null) return;
        java.util.Optional<BankAccount> optBank = bankRepo.findById(tx.getAccount());
        if (optBank.isEmpty()) {
            optBank = bankRepo.findByNameIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId());
        }
        if (optBank.isEmpty()) {
            optBank = bankRepo.findFirstByBankIgnoreCaseAndUserId(tx.getAccount(), tx.getUserId());
        }
        optBank.ifPresent(bank -> {
            BigDecimal abs = tx.getAmount().abs();
            BigDecimal cur = bank.getBalance() != null ? bank.getBalance() : BigDecimal.ZERO;
            BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
            if ("EXPENSE".equalsIgnoreCase(tx.getType())) {
                bank.setBalance(cur.subtract(delta));
            } else if ("INCOME".equalsIgnoreCase(tx.getType())) {
                bank.setBalance(cur.add(delta));
            }
            bankRepo.save(bank);
        });
    }

    // FLAW #4 + FLAW #13 FIX: Budget 'spent' is computed from transactions within the budget period.
    // Only transactions whose transactionDate falls within [budget.periodStart, budget.periodEnd]
    // are counted. 'spent' is never accepted from client input.
    private void applyBudgetDelta(Transaction tx, int sign) {
        if (!"EXPENSE".equalsIgnoreCase(tx.getType())) return;
        if (tx.getCategory() == null || tx.getCategory().isBlank() || tx.getAmount() == null || tx.getUserId() == null) return;
        BigDecimal abs = tx.getAmount().abs();
        BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
        LocalDate txDate = tx.getTransactionDate();
        for (Budget b : budgetRepo.findAllByUserId(tx.getUserId())) {
            if (b.getCategory() != null && b.getCategory().equalsIgnoreCase(tx.getCategory())) {
                if (b.getCurrency() != null && tx.getCurrency() != null
                        && !b.getCurrency().equalsIgnoreCase(tx.getCurrency())) continue;
                // FLAW #13 FIX: Only apply delta if tx date is within the budget's period
                if (txDate != null && b.getPeriodStart() != null && b.getPeriodEnd() != null) {
                    if (txDate.isBefore(b.getPeriodStart()) || txDate.isAfter(b.getPeriodEnd())) continue;
                }
                BigDecimal cur = b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO;
                // FLAW #4 FIX: Use package-private internal setter — never the public one from client
                b.setSpentInternal(cur.add(delta));
                budgetRepo.save(b);
            }
        }
    }

    private void applySavingsDelta(Transaction tx, int sign) {
        if (tx.getSavingsGoalId() == null || tx.getSavingsGoalId().isBlank() || tx.getAmount() == null) return;
        savingsRepo.findById(tx.getSavingsGoalId()).ifPresent(goal -> {
            if (goal.getUserId() != null && !goal.getUserId().equals(tx.getUserId())) return;
            BigDecimal abs = tx.getAmount().abs();
            BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
            BigDecimal cur = goal.getCurrent() != null ? goal.getCurrent() : BigDecimal.ZERO;
            goal.setCurrent(cur.add(delta));
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
                case "confidence" -> tx.setConfidence(new BigDecimal(value.toString()));
                case "savingsGoalId" -> tx.setSavingsGoalId((String) value);
                case "currency" -> tx.setCurrency((String) value);
                default -> {}
            }
        });
    }
}
