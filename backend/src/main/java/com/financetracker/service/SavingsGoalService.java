package com.financetracker.service;

import com.financetracker.model.SavingsGoal;
import com.financetracker.repository.SavingsGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {
    private final SavingsGoalRepository repo;

    @Transactional(readOnly = true)
    public List<SavingsGoal> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public List<SavingsGoal> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public SavingsGoal create(SavingsGoal goal) {
        if (goal.getId() == null || goal.getId().isBlank()) {
            goal.setId("goal-" + System.currentTimeMillis());
        }
        return repo.save(goal);
    }

    @SuppressWarnings("null")
    @Transactional
    public SavingsGoal update(String id, SavingsGoal updates) {
        SavingsGoal existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Savings goal not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getTarget() != null) existing.setTarget(updates.getTarget());
        if (updates.getCurrent() != null) existing.setCurrent(updates.getCurrent());
        if (updates.getEmoji() != null) existing.setEmoji(updates.getEmoji());
        if (updates.getDeadline() != null) existing.setDeadline(updates.getDeadline());
        if (updates.getIsHero() != null) existing.setIsHero(updates.getIsHero());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
