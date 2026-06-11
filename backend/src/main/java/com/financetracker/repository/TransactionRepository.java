package com.financetracker.repository;

import com.financetracker.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findAllByUserIdOrderByTransactionDateDesc(String userId);
    List<Transaction> findAllByIdInAndUserId(List<String> ids, String userId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.id NOT IN :ids AND t.status != 'VOIDED'")
    List<Transaction> findToVoid(@Param("userId") String userId, @Param("ids") List<String> ids);
    List<Transaction> findAllByUserIdAndTransactionDateBetweenAndStatusNot(
        String userId, java.time.LocalDate start, java.time.LocalDate end, String excludeStatus);

    @Modifying
    @Query("UPDATE Transaction t SET t.status = 'VOIDED' WHERE t.userId = :userId")
    void voidAllByUserId(@Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);

    Optional<Transaction> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);

    long countByUserId(String userId);

    // ISSUE #1 + Phase5.0015 FIX: Sum transactions for a savings goal, strictly filtering by currency alignment.
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
        "WHERE t.savingsGoalId = :goalId AND t.status != 'VOIDED' " +
        "AND (:currency IS NULL OR UPPER(t.currency) = UPPER(:currency))")
    BigDecimal sumBySavingsGoalId(@Param("goalId") String goalId, @Param("currency") String currency);
}
