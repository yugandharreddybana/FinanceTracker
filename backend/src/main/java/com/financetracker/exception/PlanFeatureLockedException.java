package com.financetracker.exception;

import com.financetracker.model.PlanFeature;
import com.financetracker.model.PlanTier;
import lombok.Getter;

@Getter
public class PlanFeatureLockedException extends RuntimeException {
    private final PlanFeature feature;
    private final PlanTier requiredTier;

    public PlanFeatureLockedException(PlanFeature feature, PlanTier requiredTier) {
        super("Feature " + feature.name() + " requires " + requiredTier.name() + " plan");
        this.feature = feature;
        this.requiredTier = requiredTier;
    }
}
