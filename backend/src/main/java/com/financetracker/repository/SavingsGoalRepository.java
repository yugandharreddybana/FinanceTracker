package com.financetracker.repository;

import com.financetracker.model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, String> {
    List<SavingsGoal> findAllByUserId(String userId);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
