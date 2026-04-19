package com.financetracker.repository;

import com.financetracker.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface LoanRepository extends JpaRepository<Loan, String> {
    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
