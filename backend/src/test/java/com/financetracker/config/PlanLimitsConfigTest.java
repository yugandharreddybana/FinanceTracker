package com.financetracker.config;

import com.financetracker.model.LimitableResource;
import com.financetracker.model.PlanFeature;
import com.financetracker.model.PlanTier;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlanLimitsConfigTest {

    @Test
    void freeTierLimits() {
        assertEquals(3, PlanLimitsConfig.getResourceLimit(PlanTier.FREE, LimitableResource.BANK_ACCOUNT));
        assertEquals(5, PlanLimitsConfig.getAiMonthlyLimit(PlanTier.FREE));
        assertFalse(PlanLimitsConfig.isFeatureAvailable(PlanTier.FREE, PlanFeature.INVESTMENTS));
        assertTrue(PlanLimitsConfig.isFeatureAvailable(PlanTier.FREE, PlanFeature.AI));
    }

    @Test
    void proTierLimits() {
        assertEquals(10, PlanLimitsConfig.getResourceLimit(PlanTier.PRO, LimitableResource.BUDGET));
        assertEquals(100, PlanLimitsConfig.getAiMonthlyLimit(PlanTier.PRO));
        assertEquals(3, PlanLimitsConfig.getResourceLimit(PlanTier.PRO, LimitableResource.FAMILY_MEMBER));
        assertTrue(PlanLimitsConfig.isFeatureAvailable(PlanTier.PRO, PlanFeature.LOANS));
    }

    @Test
    void enterpriseUnlimited() {
        assertNull(PlanLimitsConfig.getResourceLimit(PlanTier.ENTERPRISE, LimitableResource.BANK_ACCOUNT));
        assertNull(PlanLimitsConfig.getAiMonthlyLimit(PlanTier.ENTERPRISE));
    }
}
