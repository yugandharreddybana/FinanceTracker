package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
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

    // FLAW #4 FIX: 'spent' is READ-ONLY — computed server-side via TransactionService.
    // It is never written from client input. The setter is intentionally package-private
    // so only server-side service code can update it.
    @Column(precision = 15, scale = 2)
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

    public enum PeriodType {
        MONTHLY, WEEKLY, CUSTOM
    }

    // Package-private spent setter — prevents accidental client-controlled writes
    void setSpentInternal(BigDecimal spent) {
        this.spent = spent;
    }
}
