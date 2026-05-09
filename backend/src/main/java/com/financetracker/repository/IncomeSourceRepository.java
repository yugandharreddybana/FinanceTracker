package com.financetracker.repository;

import com.financetracker.model.IncomeSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface IncomeSourceRepository extends JpaRepository<IncomeSource, String> {
    List<IncomeSource> findAllByUserId(String userId);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
