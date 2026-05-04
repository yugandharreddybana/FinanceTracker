package com.financetracker.service;

import com.financetracker.model.FamilyAccount;
import com.financetracker.repository.FamilyAccountRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FamilyAccountService {
    private final FamilyAccountRepository repo;

    @Transactional(readOnly = true)
    public List<FamilyAccount> findAllForUser(String userId) {
        return repo.findAllByOwnerId(userId).stream()
                .filter(f -> isOwnerOrMember(f, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<FamilyAccount> findByIdForUser(String id, String userId) {
        return repo.findById(id).filter(f -> isOwnerOrMember(f, userId));
    }

    private boolean isOwnerOrMember(FamilyAccount f, String userId) {
        if (userId == null) return false;
        if (userId.equals(f.getOwnerId())) return true;
        if (f.getMembers() != null) {
            return f.getMembers().stream().anyMatch(m -> userId.equals(m.getUid()));
        }
        return false;
    }

    @Transactional
    public FamilyAccount create(FamilyAccount family) {
        if (family.getId() == null || family.getId().isBlank()) {
            family.setId("fam-" + System.currentTimeMillis());
        }
        return repo.save(family);
    }

    @SuppressWarnings("null")
    @Transactional
    public FamilyAccount update(String id, FamilyAccount updates, String requestUserId) {
        FamilyAccount existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Family account not found: " + id));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getMembers() != null) existing.setMembers(updates.getMembers());
        if (updates.getSharedBudgets() != null) existing.setSharedBudgets(updates.getSharedBudgets());
        if (updates.getSharedAccounts() != null) existing.setSharedAccounts(updates.getSharedAccounts());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        FamilyAccount existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Family account not found: " + id));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        repo.deleteById(id);
    }
}
