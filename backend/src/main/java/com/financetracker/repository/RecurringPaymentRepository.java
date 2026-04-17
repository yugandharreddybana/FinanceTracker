package com.financetracker.repository;

import com.financetracker.model.RecurringPayment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, String> {
}
