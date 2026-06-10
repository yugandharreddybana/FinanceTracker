package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

// Phase5.0001: drop @Data so Lombok no longer synthesises a public setSpent;
// every other setter is generated explicitly via @Setter, but spent has only
// the package-private setSpentInternal below. Combined with the JsonProperty
// READ_ONLY annotation, neither Jackson nor unrelated callers can write spent.
@Getter
@Setter
@Entity
@Table(name = "budgets", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Budget {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String category;
    private String emoji;

    @Column(name = "budget_limit", precision = 15, scale = 2)
    @JsonProperty("limit")
    private BigDecimal limit;

    // FLAW #4 + Phase5.0001 FIX: 'spent' is READ-ONLY — computed server-side via
    // TransactionService.applyBudgetDelta(). Jackson cannot deserialize this
    // field (READ_ONLY) and the only Java setter is package-private below.
    @Column(precision = 15, scale = 2)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Setter(AccessLevel.PACKAGE)
    private BigDecimal spent;

    private String color;
    private Boolean rolloverEnabled;

    @Column(precision = 15, scale = 2)
    private BigDecimal rolloverAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal perTransactionLimit;

    private String dueDate;

    @Column(length = 10)
    private String currency;

    // FLAW #13 FIX: Budget period fields — every budget is scoped to a period.
    // applyBudgetDelta in TransactionService only accumulates spend within [periodStart, periodEnd].
    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", length = 20)
    private PeriodType periodType;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    // Phase4.011: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private java.time.Instant deletedAt;

    public enum PeriodType {
        MONTHLY, WEEKLY, CUSTOM
    }

    // Server-only mutators for safer domain updates (Phase4.024).
    // Drops naked public setSpentInternal setter to prevent arbitrary rewrites.
    public void applySpentDelta(BigDecimal delta) {
        BigDecimal cur = this.spent != null ? this.spent : BigDecimal.ZERO;
        this.spent = cur.add(delta);
    }

    public void resetSpent() {
        this.spent = BigDecimal.ZERO;
    }
}
