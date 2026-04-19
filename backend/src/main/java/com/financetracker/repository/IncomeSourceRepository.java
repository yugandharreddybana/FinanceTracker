package com.financetracker.repository;

import com.financetracker.model.IncomeSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface IncomeSourceRepository extends JpaRepository<IncomeSource, String> {
    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
