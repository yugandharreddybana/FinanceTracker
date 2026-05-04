package com.financetracker.service;

import com.financetracker.model.Budget;
import com.financetracker.repository.BudgetRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetService {
    private final BudgetRepository repo;

    @Transactional(readOnly = true)
    public List<Budget> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public Budget create(Budget budget) {
        if (budget.getId() == null || budget.getId().isBlank()) {
            budget.setId("budget-" + UUID.randomUUID());
        }
        // FLAW #4 FIX: Ignore any client-supplied 'spent' value at creation — starts at zero
        budget.setSpentInternal(java.math.BigDecimal.ZERO);
        return repo.save(budget);
    }

    @SuppressWarnings("null")
    @Transactional
    public Budget update(String id, Budget updates, String requestUserId) {
        Budget existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Budget not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
        if (updates.getEmoji() != null) existing.setEmoji(updates.getEmoji());
        if (updates.getLimit() != null) existing.setLimit(updates.getLimit());
        // FLAW #4 FIX: 'spent' is intentionally NOT updated from client input here.
        // It is managed exclusively by TransactionService.applyBudgetDelta().
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getRolloverEnabled() != null) existing.setRolloverEnabled(updates.getRolloverEnabled());
        if (updates.getRolloverAmount() != null) existing.setRolloverAmount(updates.getRolloverAmount());
        if (updates.getPerTransactionLimit() != null) existing.setPerTransactionLimit(updates.getPerTransactionLimit());
        if (updates.getDueDate() != null) existing.setDueDate(updates.getDueDate());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        // FLAW #13 FIX: Period fields are updatable (e.g. monthly reset)
        if (updates.getPeriodType() != null) existing.setPeriodType(updates.getPeriodType());
        if (updates.getPeriodStart() != null) existing.setPeriodStart(updates.getPeriodStart());
        if (updates.getPeriodEnd() != null) existing.setPeriodEnd(updates.getPeriodEnd());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Budget existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Budget not found: " + id));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        repo.deleteById(id);
    }
}
