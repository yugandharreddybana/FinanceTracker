package com.financetracker.service;

import com.financetracker.model.IncomeSource;
import com.financetracker.repository.IncomeSourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncomeSourceService {
    private final IncomeSourceRepository repo;

    @Transactional(readOnly = true)
    public List<IncomeSource> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public List<IncomeSource> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public IncomeSource create(IncomeSource income) {
        if (income.getId() == null || income.getId().isBlank()) {
            income.setId("income-" + System.currentTimeMillis());
        }
        return repo.save(income);
    }

    @SuppressWarnings("null")
    @Transactional
    public IncomeSource update(String id, IncomeSource updates) {
        IncomeSource existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Income source not found: " + id));
        if (updates.getSource() != null) existing.setSource(updates.getSource());
        if (updates.getAmount() != null) existing.setAmount(updates.getAmount());
        if (updates.getDate() != null) existing.setDate(updates.getDate());
        if (updates.getFrequency() != null) existing.setFrequency(updates.getFrequency());
        if (updates.getColor() != null) existing.setColor(updates.getColor());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
