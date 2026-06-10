package com.financetracker.repository;

import com.financetracker.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, String> {
    List<Budget> findAllByUserId(String userId);
    List<Budget> findAllByUserIdAndDeletedFalse(String userId);
    // ISSUE #9 / 4.056 FIX: Query only active budgets for rollover.
    List<Budget> findAllByPeriodTypeAndDeletedFalse(Budget.PeriodType periodType);
    List<Budget> findAllByUserIdAndCategoryIgnoreCaseAndCurrencyAndDeletedFalse(String userId, String category, String currency);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
