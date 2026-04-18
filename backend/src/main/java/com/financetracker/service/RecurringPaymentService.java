package com.financetracker.service;

import com.financetracker.model.RecurringPayment;
import com.financetracker.repository.RecurringPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecurringPaymentService {
    private final RecurringPaymentRepository repo;

    @Transactional(readOnly = true)
    public List<RecurringPayment> findAll() {
        return repo.findAll();
    }

    @Transactional
    public RecurringPayment create(RecurringPayment payment) {
        if (payment.getId() == null || payment.getId().isBlank()) {
            payment.setId("rec-" + System.currentTimeMillis());
        }
        return repo.save(payment);
    }

    @SuppressWarnings("null")
    @Transactional
    public RecurringPayment update(String id, RecurringPayment updates) {
        RecurringPayment existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Recurring payment not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getAmount() != null) existing.setAmount(updates.getAmount());
        if (updates.getDayOfMonth() != null) existing.setDayOfMonth(updates.getDayOfMonth());
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getFrequency() != null) existing.setFrequency(updates.getFrequency());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getPaymentMethod() != null) existing.setPaymentMethod(updates.getPaymentMethod());
        if (updates.getDueDate() != null) existing.setDueDate(updates.getDueDate());
        if (updates.getHistory() != null) existing.setHistory(updates.getHistory());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
