package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.List;

@Data
@Entity
@Table(name = "loans", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Loan {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String name;

    @DecimalMin(value = "0.01", message = "totalAmount must be positive")
    @DecimalMax(value = "999999999.99", message = "totalAmount exceeds maximum")
    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal remainingAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal monthlyEMI;

    // Phase5.0007: bounded interest rate (0–100% APR) — protects amortisation
    // from negative rates (which divide by ((1+r)^n - 1) = 0 → NaN/infinite loop).
    @DecimalMin(value = "0.0", message = "interestRate cannot be negative")
    @DecimalMax(value = "100.0", message = "interestRate cannot exceed 100%")
    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate;

    // Phase5.0007: tenure 1–50 years — n=0 would crash the EMI formula.
    @Min(value = 1, message = "tenureYears must be at least 1")
    @Max(value = 50, message = "tenureYears cannot exceed 50")
    private Integer tenureYears;
    private String startDate;
    private String endDate;
    private String category;
    private String color;

    @Column(length = 10)
    private String currency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<LoanPayment> payments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanPayment {
        private String date;
        // FLAW #5 FIX: All monetary values use BigDecimal — Double causes IEEE 754
        // floating-point drift on amortization schedules (e.g. 300 payments on a 25yr mortgage).
        // RoundingMode.HALF_EVEN (banker's rounding) must be used on all division operations.
        private BigDecimal amount;
        private BigDecimal principal;
        private BigDecimal interest;
    }
}
