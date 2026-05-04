package com.financetracker.service;

import com.financetracker.model.AuditLog;
import com.financetracker.model.SavingsGoal;
import com.financetracker.repository.AuditLogRepository;
import com.financetracker.repository.SavingsGoalRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {
    private final SavingsGoalRepository repo;
    private final TransactionRepository txRepo;
    private final AuditLogRepository auditRepo;

    @Transactional(readOnly = true)
    public List<SavingsGoal> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public SavingsGoal create(SavingsGoal goal) {
        // ISSUE #16 FIX: UUID-based ID — no timestamp collision
        goal.setId("goal-" + UUID.randomUUID());
        // ISSUE #1 FIX: current always starts at zero — never from client input
        goal.setCurrentInternal(BigDecimal.ZERO);
        return repo.save(goal);
    }

    @Transactional
    public SavingsGoal update(String id, SavingsGoal updates, String requestUserId) {
        SavingsGoal existing = repo.findById(id)
            .orElseThrow(() -> new jakarta.ws.rs.NotFoundException("Savings goal not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getTarget() != null) existing.setTarget(updates.getTarget());
        // ISSUE #1 FIX: 'current' is intentionally NOT updated from client input
        if (updates.getEmoji() != null) existing.setEmoji(updates.getEmoji());
        if (updates.getDeadline() != null) existing.setDeadline(updates.getDeadline());
        if (updates.getIsHero() != null) existing.setIsHero(updates.getIsHero());
        if (updates.getCurrency() != null) existing.setCurrency(updates.getCurrency());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        SavingsGoal existing = repo.findById(id)
            .orElseThrow(() -> new jakarta.ws.rs.NotFoundException("Savings goal not found"));
        Guards.assertOwner(existing.getUserId(), requestUserId);
        // ISSUE #22 FIX: Soft-delete — never hard-delete
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }

    /**
     * ISSUE #1 + #15 FIX:
     * Called by TransactionService.applySavingsDelta() after every transaction mutation.
     * Caps current at target and fires a completion audit event when goal is reached.
     */
    @Transactional
    public void recalculateAndCheckCompletion(String goalId) {
        repo.findById(goalId).ifPresent(goal -> {
            BigDecimal total = txRepo.sumBySavingsGoalId(goalId);
            BigDecimal newCurrent = total != null ? total.max(BigDecimal.ZERO) : BigDecimal.ZERO;
            boolean justCompleted = goal.getTarget() != null
                && newCurrent.compareTo(goal.getTarget()) >= 0
                && (goal.getCurrent() == null || goal.getCurrent().compareTo(goal.getTarget()) < 0);
            // Cap current at target — no overrun
            if (goal.getTarget() != null) {
                newCurrent = newCurrent.min(goal.getTarget());
            }
            goal.setCurrentInternal(newCurrent);
            repo.save(goal);
            // ISSUE #15 FIX: Fire a goal-completed audit event
            if (justCompleted) {
                AuditLog log = AuditLog.builder()
                    .id("log-" + UUID.randomUUID())
                    .userId(goal.getUserId())
                    .timestamp(Instant.now())
                    .action("SAVINGS_GOAL_COMPLETED")
                    .entityType("SavingsGoal")
                    .entityId(goalId)
                    .details("Goal '" + goal.getName() + "' reached target of " + goal.getTarget())
                    .build();
                auditRepo.save(log);
            }
        });
    }
}
