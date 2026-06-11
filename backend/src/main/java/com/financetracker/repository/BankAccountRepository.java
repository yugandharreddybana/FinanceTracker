package com.financetracker.repository;

import com.financetracker.model.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccount, String> {
    List<BankAccount> findAllByUserId(String userId);
    List<BankAccount> findAllByUserIdAndDeletedFalse(String userId);
    java.util.Optional<BankAccount> findByIdAndUserId(String id, String userId);
    java.util.Optional<BankAccount> findByNameIgnoreCaseAndUserId(String name, String userId);
    java.util.Optional<BankAccount> findFirstByBankIgnoreCaseAndUserId(String bank, String userId);
    java.util.Optional<BankAccount> findByUserIdAndIsPrimaryTrue(String userId);

    java.util.List<BankAccount> findAllByUserIdAndIsPrimaryTrue(String userId);

    java.util.List<BankAccount> findAllByUserIdAndCurrencyAndIsPrimaryTrue(String userId, String currency);

    long countByUserIdAndDeletedFalse(String userId);

    @Modifying

    @Transactional
    void deleteByUserId(String userId);
}
