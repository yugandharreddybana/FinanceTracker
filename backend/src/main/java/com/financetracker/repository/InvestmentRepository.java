package com.financetracker.repository;

import com.financetracker.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestmentRepository extends JpaRepository<Investment, String> {
}
