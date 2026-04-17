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

    @Transactional(readOnly = true)
    public List<Transaction> findAll() {
        return repo.findAll();
    }

    @Transactional
    public Transaction create(Transaction tx) {
        if (tx.getId() == null || tx.getId().isBlank()) {
            tx.setId("tx-" + System.currentTimeMillis());
        }
        return repo.save(tx);
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
        repo.deleteById(id);
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
    public void syncTransactions(List<Transaction> transactions) {
        repo.deleteAll();
        repo.saveAll(transactions);
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
