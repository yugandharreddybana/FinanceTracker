package com.financetracker.service;

import com.financetracker.config.PlanLimitsConfig;
import com.financetracker.exception.PlanFeatureLockedException;
import com.financetracker.exception.PlanLimitExceededException;
import com.financetracker.model.*;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PlanLimitService {

    private final AppUserRepository userRepository;
    private final BankAccountRepository bankAccountRepository;
    private final BudgetRepository budgetRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final LoanRepository loanRepository;
    private final RecurringPaymentRepository recurringPaymentRepository;
    private final InvestmentRepository investmentRepository;
    private final IncomeSourceRepository incomeSourceRepository;
    private final FamilyAccountRepository familyAccountRepository;

    @Transactional(readOnly = true)
    public PlanTier getTier(String userId) {
        return userRepository.findById(userId)
            .map(u -> u.getPlanTier() != null ? u.getPlanTier() : PlanTier.FREE)
            .orElse(PlanTier.FREE);
    }

    @Transactional(readOnly = true)
    public void assertCanAccessFeature(String userId, PlanFeature feature) {
        PlanTier tier = getTier(userId);
        if (!PlanLimitsConfig.isFeatureAvailable(tier, feature)) {
            throw new PlanFeatureLockedException(feature, PlanLimitsConfig.minimumTierFor(feature));
        }
    }

    @Transactional(readOnly = true)
    public void assertCanCreate(String userId, LimitableResource resource) {
        PlanTier tier = getTier(userId);
        PlanFeature feature = featureForResource(resource);
        if (feature != null && !PlanLimitsConfig.isFeatureAvailable(tier, feature)) {
            throw new PlanFeatureLockedException(feature, PlanLimitsConfig.minimumTierFor(feature));
        }
        Integer limit = PlanLimitsConfig.getResourceLimit(tier, resource);
        if (limit == null) return;
        int usage = countResource(userId, resource);
        if (usage >= limit) {
            PlanTier required = tier == PlanTier.FREE ? PlanTier.PRO : PlanTier.ENTERPRISE;
            throw new PlanLimitExceededException(resource, limit, usage, required);
        }
    }

    @Transactional(readOnly = true)
    public int countResource(String userId, LimitableResource resource) {
        long count = switch (resource) {
            case BANK_ACCOUNT -> bankAccountRepository.countByUserIdAndDeletedFalse(userId);
            case BUDGET -> budgetRepository.countByUserIdAndDeletedFalse(userId);
            case SAVINGS_GOAL -> savingsGoalRepository.countByUserIdAndDeletedFalse(userId);
            case LOAN -> loanRepository.countByUserIdAndDeletedFalse(userId);
            case RECURRING_PAYMENT -> recurringPaymentRepository.countByUserIdAndDeletedFalse(userId);
            case INVESTMENT -> investmentRepository.countByUserIdAndDeletedFalse(userId);
            case INCOME_SOURCE -> incomeSourceRepository.countByUserIdAndDeletedFalse(userId);
            case FAMILY_MEMBER -> countFamilyMembers(userId);
        };
        return (int) count;
    }

    private int countFamilyMembers(String userId) {
        return familyAccountRepository.findAllByOwnerIdAndDeletedFalse(userId).stream()
            .mapToInt(f -> f.getMembers() != null ? f.getMembers().size() : 0)
            .sum();
    }

    @Transactional(readOnly = true)
    public void assertCanAddFamilyMember(String userId, int currentFamilyMemberCount) {
        PlanTier tier = getTier(userId);
        if (!PlanLimitsConfig.isFeatureAvailable(tier, PlanFeature.FAMILY)) {
            throw new PlanFeatureLockedException(PlanFeature.FAMILY, PlanTier.PRO);
        }
        Integer limit = PlanLimitsConfig.getResourceLimit(tier, LimitableResource.FAMILY_MEMBER);
        if (limit == null) return;
        if (currentFamilyMemberCount >= limit) {
            throw new PlanLimitExceededException(
                LimitableResource.FAMILY_MEMBER, limit, currentFamilyMemberCount,
                tier == PlanTier.PRO ? PlanTier.ENTERPRISE : PlanTier.PRO);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> buildUsageSummary(String userId) {
        PlanTier tier = getTier(userId);
        Map<String, Integer> limits = new LinkedHashMap<>();
        Map<String, Integer> usage = new LinkedHashMap<>();
        for (LimitableResource r : LimitableResource.values()) {
            String key = r.name().toLowerCase();
            Integer limit = PlanLimitsConfig.getResourceLimit(tier, r);
            limits.put(key, limit);
            usage.put(key, countResource(userId, r));
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("tier", tier.name());
        summary.put("limits", limits);
        summary.put("usage", usage);
        return summary;
    }

    private PlanFeature featureForResource(LimitableResource resource) {
        return switch (resource) {
            case LOAN -> PlanFeature.LOANS;
            case RECURRING_PAYMENT -> PlanFeature.RECURRING;
            case INVESTMENT -> PlanFeature.INVESTMENTS;
            case INCOME_SOURCE -> PlanFeature.INCOME;
            case FAMILY_MEMBER -> PlanFeature.FAMILY;
            default -> null;
        };
    }
}
