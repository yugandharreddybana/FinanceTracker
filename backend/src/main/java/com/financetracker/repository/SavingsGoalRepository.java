package com.financetracker.repository;

import com.financetracker.model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, String> {
}
