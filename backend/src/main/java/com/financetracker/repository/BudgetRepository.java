package com.financetracker.repository;

import com.financetracker.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface BudgetRepository extends JpaRepository<Budget, String> {
    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
