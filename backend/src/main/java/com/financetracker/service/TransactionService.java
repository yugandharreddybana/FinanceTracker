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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository repo;
    private final BankAccountRepository bankRepo;
    private final BudgetRepository budgetRepo;
    private final SavingsGoalRepository savingsRepo;

    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public Transaction create(Transaction tx) {
        if (tx.getId() == null || tx.getId().isBlank()) {
            tx.setId("tx-" + System.currentTimeMillis());
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

        Transaction saved = repo.save(tx);
        applyBalanceDelta(saved, +1);
        applyBudgetDelta(saved, +1);
        applySavingsDelta(saved, +1);
        return saved;
    }

    @SuppressWarnings("null")
    @Transactional
    public Transaction update(String id, Map<String, Object> updates, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
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

    @Transactional
    public void delete(String id, String requestUserId) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        Guards.assertOwner(tx.getUserId(), requestUserId);
        applyBalanceDelta(tx, -1);
        applyBudgetDelta(tx, -1);
        applySavingsDelta(tx, -1);
        repo.delete(tx);
    }

    @SuppressWarnings("null")
    @Transactional
    public int bulkUpdate(List<String> ids, Map<String, Object> updates, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            applyBalanceDelta(tx, -1);
            applyBudgetDelta(tx, -1);
            applySavingsDelta(tx, -1);
            applyUpdates(tx, updates);
        }
        repo.saveAll(txs);
        for (Transaction tx : txs) {
            applyBalanceDelta(tx, +1);
            applyBudgetDelta(tx, +1);
            applySavingsDelta(tx, +1);
        }
        return txs.size();
    }

    @SuppressWarnings("null")
    @Transactional
    public int bulkDelete(List<String> ids, String requestUserId) {
        Guards.requireUser(requestUserId);
        List<Transaction> txs = repo.findAllByIdInAndUserId(ids, requestUserId);
        for (Transaction tx : txs) {
            applyBalanceDelta(tx, -1);
            applyBudgetDelta(tx, -1);
            applySavingsDelta(tx, -1);
        }
        repo.deleteAll(txs);
        return txs.size();
    }

    @Transactional
    public void syncTransactions(String userId, List<Transaction> transactions) {
        Guards.requireUser(userId);
        repo.deleteByUserId(userId);
        for (Transaction tx : transactions) {
            tx.setUserId(userId);
        }
        repo.saveAll(transactions);
    }

    // sign = +1 to apply, -1 to reverse
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

    private void applyBudgetDelta(Transaction tx, int sign) {
        if (!"EXPENSE".equalsIgnoreCase(tx.getType())) return;
        if (tx.getCategory() == null || tx.getCategory().isBlank() || tx.getAmount() == null || tx.getUserId() == null) return;
        BigDecimal abs = tx.getAmount().abs();
        BigDecimal delta = abs.multiply(BigDecimal.valueOf(sign));
        for (Budget b : budgetRepo.findAllByUserId(tx.getUserId())) {
            if (b.getCategory() != null && b.getCategory().equalsIgnoreCase(tx.getCategory())) {
                if (b.getCurrency() != null && tx.getCurrency() != null
                        && !b.getCurrency().equalsIgnoreCase(tx.getCurrency())) continue;
                BigDecimal cur = b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO;
                b.setSpent(cur.add(delta));
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
