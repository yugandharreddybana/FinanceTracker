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
    List<Transaction> findAllByUserId(String userId);
    List<Transaction> findAllByIdInAndUserId(List<String> ids, String userId);

    @Modifying
    @Query("UPDATE Transaction t SET t.status = 'VOIDED' WHERE t.userId = :userId")
    void voidAllByUserId(@Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);

    Optional<Transaction> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);

    // ISSUE #1 FIX: Sum transactions for a savings goal (used by SavingsGoalService.recalculate)
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
        "WHERE t.savingsGoalId = :goalId AND t.status != 'VOIDED'")
    BigDecimal sumBySavingsGoalId(@Param("goalId") String goalId);
}
