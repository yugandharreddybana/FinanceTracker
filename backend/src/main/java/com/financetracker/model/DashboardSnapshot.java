package com.financetracker.model;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * ISSUE #14 FIX: Server-side net worth and financial health snapshot.
 * Computed atomically in a single read transaction by DashboardService.
 * Never assembled on the frontend from multiple async calls.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSnapshot {
    private Instant computedAt;
    private String userId;

    // Balances
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private BigDecimal netWorth;
    private BigDecimal totalInvestmentValue;
    private BigDecimal totalSavingsProgress;

    // Cash flow (current month)
    private BigDecimal monthlyIncome;
    private BigDecimal monthlyExpenses;
    private BigDecimal monthlyCashFlow;
    private BigDecimal savingsRate; // (income - expenses) / income * 100

    // Budgets
    private int budgetsOverLimit;
    private int budgetsNearLimit; // > 80%

    // Stale accounts
    private List<String> staleAccountIds;

    // Spending by category this month
    private Map<String, BigDecimal> spendingByCategory;
}
