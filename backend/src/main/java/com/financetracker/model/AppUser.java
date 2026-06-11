package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "app_users", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {
    @Id
    private String id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String displayName;

    private String passwordHash;
    private String salt;
    
    @Builder.Default
    private Integer hashIterations = 600000;
    
    @Builder.Default
    private Boolean emailVerified = false;

    @Builder.Default
    private java.time.Instant createdAt = java.time.Instant.now();

    @Builder.Default
    private java.time.Instant passwordChangedAt = java.time.Instant.now();

    @Builder.Default
    private Boolean deleted = false;

    private java.time.Instant deletedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_tier", nullable = false, length = 20)
    @Builder.Default
    private PlanTier planTier = PlanTier.FREE;

    @Column(name = "stripe_customer_id", unique = true)
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "subscription_status", length = 32)
    private String subscriptionStatus;

    @Column(name = "current_period_end")
    private java.time.Instant currentPeriodEnd;

    @Column(name = "billing_currency", length = 3)
    private String billingCurrency;
}
