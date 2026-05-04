package com.financetracker.repository;

import com.financetracker.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, String> {
    List<Budget> findAllByUserId(String userId);
    // ISSUE #9 FIX: Query used by BudgetRolloverScheduler
    List<Budget> findAllByPeriodType(Budget.PeriodType periodType);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
