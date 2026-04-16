package com.financetracker.repositories;

import com.financetracker.models.RecurringPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, String> {
}
