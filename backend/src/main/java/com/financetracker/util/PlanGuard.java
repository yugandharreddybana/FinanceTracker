package com.financetracker.util;

import com.financetracker.model.PlanFeature;
import com.financetracker.service.PlanLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PlanGuard {
    private final PlanLimitService planLimitService;

    public void requireFeature(String userId, PlanFeature feature) {
        planLimitService.assertCanAccessFeature(userId, feature);
    }
}
