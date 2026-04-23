package com.financetracker.repository;

import com.financetracker.model.RecurringPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, String> {
    List<RecurringPayment> findAllByUserId(String userId);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
