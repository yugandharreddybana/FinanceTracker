package com.financetracker.repository;

import com.financetracker.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface InvestmentRepository extends JpaRepository<Investment, String> {
    List<Investment> findAllByUserId(String userId);
    // ISSUE #4 FIX: Used by InvestmentPriceRefreshScheduler
    List<Investment> findAllBySymbol(String symbol);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
