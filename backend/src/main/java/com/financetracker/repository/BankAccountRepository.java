package com.financetracker.repository;

import com.financetracker.model.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccount, String> {
    List<BankAccount> findAllByUserId(String userId);
    java.util.Optional<BankAccount> findByNameIgnoreCaseAndUserId(String name, String userId);


    @Modifying

    @Transactional
    void deleteByUserId(String userId);
}
