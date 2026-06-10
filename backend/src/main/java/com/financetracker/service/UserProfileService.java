package com.financetracker.service;

import com.financetracker.repository.*;
import com.financetracker.model.UserProfile;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserProfileRepository repo;
    private final TransactionRepository transactionRepo;
    private final BankAccountRepository bankAccountRepo;
    private final BudgetRepository budgetRepo;
    private final AuditLogRepository auditLogRepo;
    private final AuditLogService auditLogService;
    private final AuthenticatorRepository authenticatorRepo;
    private final FamilyAccountRepository familyAccountRepo;
    private final IncomeSourceRepository incomeSourceRepo;
    private final InvestmentRepository investmentRepo;
    private final LoanRepository loanRepo;
    private final RecurringPaymentRepository recurringPaymentRepo;
    private final SavingsGoalRepository savingsGoalRepo;
    private final AppUserRepository appUserRepo;

    @Transactional(readOnly = true)
    public List<UserProfile> findAll() { return repo.findAll(); }

    @Transactional(readOnly = true)
    public Optional<UserProfile> findById(String id, String requestUserId) {
        Guards.assertOwner(id, requestUserId);
        return repo.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<UserProfile> findByEmail(String email, String requestUserId) {
        return repo.findByEmail(email).map(profile -> {
            Guards.assertOwner(profile.getId(), requestUserId);
            return profile;
        });
    }

    @Transactional
    public UserProfile create(UserProfile profile) {
        // ISSUE #16 FIX: UUID-based ID
        if (profile.getId() == null || profile.getId().isBlank()) {
            profile.setId("user-" + UUID.randomUUID());
        }
        return repo.save(profile);
    }

    @Transactional
    public UserProfile update(String id, UserProfile updates, String requestUserId) {
        Guards.assertOwner(id, requestUserId);
        UserProfile existing = repo.findById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("User profile not found"));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getEmail() != null) existing.setEmail(updates.getEmail());
        if (updates.getRole() != null) existing.setRole(updates.getRole());
        if (updates.getAvatar() != null) existing.setAvatar(updates.getAvatar());
        if (updates.getPreferences() != null) existing.setPreferences(updates.getPreferences());
        if (updates.getFamilyId() != null) existing.setFamilyId(updates.getFamilyId());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        Guards.assertOwner(id, requestUserId);
        purgeUserData(id);
    }


    @Transactional
    public void deleteByEmailOwned(String email, String requestUserId) {
        repo.findByEmail(email).ifPresent(profile -> {
            Guards.assertOwner(profile.getId(), requestUserId);
            purgeUserData(profile.getId());
        });
    }

    // Phase5.0011: account purge must be atomic across 12+ repositories. Without
    // explicit propagation REQUIRED + rollbackFor=Exception, a connection drop
    // mid-purge could leave orphaned rows or a half-anonymised audit log. The
    // anonymise call shares this transaction (REQUIRED), so a failure there
    // rolls back every preceding deletion as a single unit.
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public void purgeUserData(String userId) {
        transactionRepo.deleteByUserId(userId);
        bankAccountRepo.deleteByUserId(userId);
        budgetRepo.deleteByUserId(userId);
        authenticatorRepo.deleteByUserId(userId);
        familyAccountRepo.deleteByOwnerId(userId);
        incomeSourceRepo.deleteByUserId(userId);
        investmentRepo.deleteByUserId(userId);
        loanRepo.deleteByUserId(userId);
        recurringPaymentRepo.deleteByUserId(userId);
        savingsGoalRepo.deleteByUserId(userId);
        // ISSUE #8 FIX: Anonymise audit logs — never hard-delete them.
        // User PII is scrubbed but event records are preserved for compliance.
        auditLogService.anonymiseByUserId(userId);
        if (repo.existsById(userId)) repo.deleteById(userId);
        if (appUserRepo.existsById(userId)) appUserRepo.deleteById(userId);
    }
}
