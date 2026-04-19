package com.financetracker.repository;

import com.financetracker.model.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface BankAccountRepository extends JpaRepository<BankAccount, String> {
    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
