package com.financetracker.service;

import com.financetracker.model.Investment;
import com.financetracker.repository.InvestmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvestmentService {
    private final InvestmentRepository repo;

    @Transactional(readOnly = true)
    public List<Investment> findAll() {
        return repo.findAll();
    }

    @Transactional
    public Investment create(Investment inv) {
        if (inv.getId() == null || inv.getId().isBlank()) {
            inv.setId("inv-" + System.currentTimeMillis());
        }
        return repo.save(inv);
    }

    @SuppressWarnings("null")
    @Transactional
    public Investment update(String id, Investment updates) {
        Investment existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Investment not found: " + id));
        if (updates.getSymbol() != null) existing.setSymbol(updates.getSymbol());
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getType() != null) existing.setType(updates.getType());
        if (updates.getQuantity() != null) existing.setQuantity(updates.getQuantity());
        if (updates.getAveragePrice() != null) existing.setAveragePrice(updates.getAveragePrice());
        if (updates.getCurrentPrice() != null) existing.setCurrentPrice(updates.getCurrentPrice());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        if (updates.getLastUpdated() != null) existing.setLastUpdated(updates.getLastUpdated());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
