package com.financetracker.repository;

import com.financetracker.model.RecurringPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, String> {
    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
