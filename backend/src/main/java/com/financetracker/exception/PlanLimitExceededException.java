package com.financetracker.exception;

import com.financetracker.model.LimitableResource;
import com.financetracker.model.PlanTier;
import lombok.Getter;

@Getter
public class PlanLimitExceededException extends RuntimeException {
    private final LimitableResource resource;
    private final int limit;
    private final int usage;
    private final PlanTier requiredTier;

    public PlanLimitExceededException(LimitableResource resource, int limit, int usage, PlanTier requiredTier) {
        super("Plan limit exceeded for " + resource.name());
        this.resource = resource;
        this.limit = limit;
        this.usage = usage;
        this.requiredTier = requiredTier;
    }
}
