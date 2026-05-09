package com.financetracker.service;

import com.financetracker.model.Investment;
import com.financetracker.repository.InvestmentRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvestmentService {
    private final InvestmentRepository repo;

    @Transactional(readOnly = true)
    public List<Investment> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public Investment create(Investment inv) {
        // ISSUE #16 FIX: UUID-based ID
        inv.setId("inv-" + UUID.randomUUID());
        inv.setLastUpdated(Instant.now());
        return repo.save(inv);
    }

    @Transactional
    public Investment update(String id, Investment updates, String requestUserId) {
        Investment existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Investment not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getSymbol() != null) existing.setSymbol(updates.getSymbol());
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getType() != null) existing.setType(updates.getType());
        if (updates.getQuantity() != null) existing.setQuantity(updates.getQuantity());
        if (updates.getAveragePrice() != null) existing.setAveragePrice(updates.getAveragePrice());
        // ISSUE #4 FIX: currentPrice is NOT accepted from client PUT body.
        // It is updated exclusively by InvestmentPriceRefreshScheduler.
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Investment existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Investment not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        // ISSUE #22 FIX: Soft-delete
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }

    // Called exclusively by InvestmentPriceRefreshScheduler — not by any controller
    @Transactional
    public void updatePricesFromMarket(String symbol, java.math.BigDecimal price) {
        List<Investment> holdings = repo.findAllBySymbol(symbol);
        for (Investment inv : holdings) {
            inv.setCurrentPrice(price);
            inv.setLastUpdated(Instant.now());
            repo.save(inv);
        }
    }
}
