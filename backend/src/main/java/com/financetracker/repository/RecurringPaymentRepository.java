package com.financetracker.repository;

import com.financetracker.model.RecurringPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, String> {
    List<RecurringPayment> findAllByUserId(String userId);

    // ISSUE #2 FIX: Finds all active payments whose dueDate is on or before today
    @Query("SELECT r FROM RecurringPayment r WHERE r.deleted = false " +
        "AND r.status != 'CANCELLED' " +
        "AND CAST(r.dueDate AS java.time.LocalDate) <= :today")
    List<RecurringPayment> findAllDueOn(@Param("today") LocalDate today);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
