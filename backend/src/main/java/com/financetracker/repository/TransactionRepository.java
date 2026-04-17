package com.financetracker.repository;

import com.financetracker.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findByCategory(String category);
    List<Transaction> findByType(String type);
    List<Transaction> findByAccount(String account);
    List<Transaction> findAllByIdIn(List<String> ids);
}
