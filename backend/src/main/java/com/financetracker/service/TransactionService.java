package com.financetracker.service;

import com.financetracker.model.Transaction;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository repo;
    private final com.financetracker.repository.BankAccountRepository bankRepo;


    @Transactional(readOnly = true)
    public List<Transaction> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public List<Transaction> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public Transaction create(Transaction tx) {
        if (tx.getId() == null || tx.getId().isBlank()) {
            tx.setId("tx-" + System.currentTimeMillis());
        }
        
        Transaction saved = repo.save(tx);
        updateBankBalance(saved, false); // false = not deleting
        return saved;
    }

    @SuppressWarnings("null")
    @Transactional
    public Transaction update(String id, Map<String, Object> updates) {
        Transaction tx = repo.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        applyUpdates(tx, updates);
        return repo.save(tx);
    }

    @Transactional
    public void delete(String id) {
        repo.findById(id).ifPresent(tx -> {
            updateBankBalance(tx, true); // true = deleting (reverse the effect)
            repo.delete(tx);
        });
    }

    private void updateBankBalance(Transaction tx, boolean isDeleting) {
        if (tx.getAccount() == null || tx.getAccount().isBlank()) return;
        
        bankRepo.findByNameAndUserId(tx.getAccount(), tx.getUserId()).ifPresent(bank -> {
            java.math.BigDecimal amount = tx.getAmount();
            if (amount == null) return;

            // If deleting, we reverse the sign
            java.math.BigDecimal finalAmount = isDeleting ? amount.negate() : amount;

            if ("EXPENSE".equalsIgnoreCase(tx.getType())) {
                java.math.BigDecimal currentBalance = bank.getBalance() != null ? bank.getBalance() : java.math.BigDecimal.ZERO;
                bank.setBalance(currentBalance.subtract(finalAmount));
            } else if ("INCOME".equalsIgnoreCase(tx.getType())) {
                java.math.BigDecimal currentBalance = bank.getBalance() != null ? bank.getBalance() : java.math.BigDecimal.ZERO;
                bank.setBalance(currentBalance.add(finalAmount));
            }
            bankRepo.save(bank);

        });
    }


    @SuppressWarnings("null")
    @Transactional
    public int bulkUpdate(List<String> ids, Map<String, Object> updates) {
        List<Transaction> txs = repo.findAllByIdIn(ids);
        for (Transaction tx : txs) {
            applyUpdates(tx, updates);
        }
        repo.saveAll(txs);
        return txs.size();
    }

    @SuppressWarnings("null")
    @Transactional
    public int bulkDelete(List<String> ids) {
        List<Transaction> txs = repo.findAllByIdIn(ids);
        repo.deleteAll(txs);
        return txs.size();
    }

    @Transactional
    public void syncTransactions(String userId, List<Transaction> transactions) {
        if (userId != null) {
            repo.deleteByUserId(userId);
            for (Transaction tx : transactions) {
                tx.setUserId(userId);
            }
            repo.saveAll(transactions);
        }
    }

    private void applyUpdates(Transaction tx, Map<String, Object> updates) {
        updates.forEach((key, value) -> {
            switch (key) {
                case "date" -> tx.setDate((String) value);
                case "merchant" -> tx.setMerchant((String) value);
                case "amount" -> tx.setAmount(new java.math.BigDecimal(value.toString()));
                case "category" -> tx.setCategory((String) value);
                case "type" -> tx.setType((String) value);
                case "status" -> tx.setStatus((String) value);
                case "aiTag" -> tx.setAiTag((String) value);
                case "account" -> tx.setAccount((String) value);
                case "confidence" -> tx.setConfidence(new java.math.BigDecimal(value.toString()));
                case "savingsGoalId" -> tx.setSavingsGoalId((String) value);
                case "currency" -> tx.setCurrency((String) value);
            }
        });
    }
}
