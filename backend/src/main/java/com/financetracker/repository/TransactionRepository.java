package com.financetracker.repository;

import com.financetracker.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findByCategory(String category);
    List<Transaction> findByType(String type);
    List<Transaction> findByAccount(String account);
    List<Transaction> findAllByIdIn(List<String> ids);
    @Modifying
    @Transactional
    void deleteByUserId(String userId);

    List<Transaction> findAllByUserId(String userId);
}
