package com.financetracker.config;

import com.financetracker.model.LimitableResource;
import com.financetracker.model.PlanFeature;
import com.financetracker.model.PlanTier;

public final class PlanLimitsConfig {

    private PlanLimitsConfig() {}

    public static boolean isFeatureAvailable(PlanTier tier, PlanFeature feature) {
        if (tier == PlanTier.ENTERPRISE) return true;
        if (tier == PlanTier.PRO) {
            return feature != PlanFeature.AI || true;
        }
        return switch (feature) {
            case AI -> true;
            case LOANS, RECURRING, INVESTMENTS, INCOME, FAMILY, ANALYTICS -> false;
        };
    }

    public static PlanTier minimumTierFor(PlanFeature feature) {
        return switch (feature) {
            case LOANS, RECURRING, INVESTMENTS, INCOME, FAMILY, ANALYTICS -> PlanTier.PRO;
            case AI -> PlanTier.FREE;
        };
    }

    public static Integer getResourceLimit(PlanTier tier, LimitableResource resource) {
        if (tier == PlanTier.ENTERPRISE) return null;
        return switch (resource) {
            case BANK_ACCOUNT, BUDGET, SAVINGS_GOAL -> tier == PlanTier.FREE ? 3 : 10;
            case LOAN, RECURRING_PAYMENT, INVESTMENT, INCOME_SOURCE -> tier == PlanTier.FREE ? 0 : 10;
            case FAMILY_MEMBER -> tier == PlanTier.FREE ? 0 : (tier == PlanTier.PRO ? 3 : null);
        };
    }

    public static Integer getAiMonthlyLimit(PlanTier tier) {
        return switch (tier) {
            case FREE -> 5;
            case PRO -> 100;
            case ENTERPRISE -> null;
        };
    }
}
