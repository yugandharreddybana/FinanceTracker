package com.financetracker.model;

public enum PlanTier {
    FREE,
    PRO,
    ENTERPRISE;

    public static PlanTier fromString(String value) {
        if (value == null || value.isBlank()) return FREE;
        try {
            return PlanTier.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return FREE;
        }
    }
}
