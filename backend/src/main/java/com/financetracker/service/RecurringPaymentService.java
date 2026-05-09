package com.financetracker.service;

import com.financetracker.model.RecurringPayment;
import com.financetracker.repository.RecurringPaymentRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecurringPaymentService {
    private final RecurringPaymentRepository repo;

    @Transactional(readOnly = true)
    public List<RecurringPayment> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public RecurringPayment create(RecurringPayment payment) {
        // ISSUE #16 FIX: UUID-based ID
        payment.setId("rec-" + UUID.randomUUID());
        return repo.save(payment);
    }

    @Transactional
    public RecurringPayment update(String id, RecurringPayment updates, String requestUserId) {
        RecurringPayment existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Recurring payment not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
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
        // ISSUE #2 NOTE: history is append-only via scheduler — never overwritten from client
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        RecurringPayment existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Recurring payment not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        // ISSUE #22 FIX: Soft-delete — mark as CANCELLED, preserve history
        existing.setStatus("CANCELLED");
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }
}
