package com.financetracker.repository;

import com.financetracker.model.IncomeSource;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeSourceRepository extends JpaRepository<IncomeSource, String> {
}
