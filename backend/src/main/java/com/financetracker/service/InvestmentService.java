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

    private static final java.util.regex.Pattern SYMBOL_PATTERN = 
        java.util.regex.Pattern.compile("^[A-Z0-9.\\-]{1,12}$");

    private void validateSymbol(String symbol) {
        if (symbol != null && !SYMBOL_PATTERN.matcher(symbol.toUpperCase()).matches()) {
            throw new IllegalArgumentException("Invalid ticker symbol format");
        }
    }

    @Transactional
    public Investment create(Investment inv) {
        validateSymbol(inv.getSymbol());
        // ISSUE #16 FIX: UUID-based ID
        inv.setId("inv-" + UUID.randomUUID());
        inv.setLastUpdated(Instant.now());
        return repo.save(inv);
    }

    @Transactional
    public Investment update(String id, Investment updates, String requestUserId) {
        Investment existing = repo.findById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Investment not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getSymbol() != null) {
            validateSymbol(updates.getSymbol());
            existing.setSymbol(updates.getSymbol());
        }
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
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Investment not found"));
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
            // Phase5.0014: setCurrentPrice is now package-private; only the
            // server-only setCurrentPriceInternal mutator (which also bumps
            // lastUpdated) is reachable from this package.
            inv.setCurrentPriceInternal(price);
            repo.save(inv);
        }
    }
}
