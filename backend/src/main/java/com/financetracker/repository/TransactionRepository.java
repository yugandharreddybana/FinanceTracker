package com.financetracker.repository;

import com.financetracker.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findAllByUserId(String userId);
    List<Transaction> findAllByIdInAndUserId(List<String> ids, String userId);

    @Modifying
    @Query("UPDATE Transaction t SET t.status = 'VOIDED' WHERE t.userId = :userId")
    void voidAllByUserId(@Param("userId") String userId);

    // FLAW #7 FIX: deleteByUserId replaced — syncTransactions now uses voidAllByUserId
    // Kept for internal cascade deletes on account purge only
    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);

    // FLAW #1 FIX: Idempotency key lookup — returns existing tx on duplicate POST
    Optional<Transaction> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
}
