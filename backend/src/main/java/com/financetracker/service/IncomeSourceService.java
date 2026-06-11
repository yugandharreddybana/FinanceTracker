package com.financetracker.service;

import com.financetracker.model.IncomeSource;
import com.financetracker.repository.IncomeSourceRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IncomeSourceService {
    private final IncomeSourceRepository repo;
    private final PlanLimitService planLimitService;

    @Transactional(readOnly = true)
    public List<IncomeSource> findAllByUserId(String userId) {
        // ISSUE 4.053 FIX: Filter out soft-deleted income sources.
        return repo.findAllByUserIdAndDeletedFalse(userId);
    }

    @Transactional
    public IncomeSource create(IncomeSource income) {
        planLimitService.assertCanCreate(income.getUserId(), com.financetracker.model.LimitableResource.INCOME_SOURCE);
        // Phase4.027: Defend against concurrent ID allocation collisions by leveraging UUIDs.
        if (income.getId() == null || income.getId().isBlank()) {
            income.setId("income-" + UUID.randomUUID());
        }
        return repo.save(income);
    }

    @SuppressWarnings("null")
    @Transactional
    public IncomeSource update(String id, IncomeSource updates, String requestUserId) {
        IncomeSource existing = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Income source not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getSource() != null) existing.setSource(updates.getSource());
        if (updates.getAmount() != null) existing.setAmount(updates.getAmount());
        if (updates.getLastReceivedDate() != null) existing.setLastReceivedDate(updates.getLastReceivedDate());
        if (updates.getNextPaymentDate() != null) existing.setNextPaymentDate(updates.getNextPaymentDate());
        if (updates.getFrequency() != null) existing.setFrequency(updates.getFrequency());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        IncomeSource existing = repo.findById(id).orElseThrow(() -> new com.financetracker.exception.NotFoundException("Income source not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        // Phase4.026: Soft-delete instead of hard purging to maintain transaction linkages and history.
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }
}
