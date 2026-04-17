package com.financetracker.service;

import com.financetracker.model.FamilyAccount;
import com.financetracker.repository.FamilyAccountRepository;
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
    public List<FamilyAccount> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<FamilyAccount> findById(String id) {
        return repo.findById(id);
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
    public FamilyAccount update(String id, FamilyAccount updates) {
        FamilyAccount existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Family account not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getMembers() != null) existing.setMembers(updates.getMembers());
        if (updates.getSharedBudgets() != null) existing.setSharedBudgets(updates.getSharedBudgets());
        if (updates.getSharedAccounts() != null) existing.setSharedAccounts(updates.getSharedAccounts());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
