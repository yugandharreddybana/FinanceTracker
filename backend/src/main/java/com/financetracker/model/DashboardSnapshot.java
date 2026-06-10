package com.financetracker.model;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * ISSUE #14 FIX: Server-side net worth and financial health snapshot.
 * Computed atomically in a single read transaction by DashboardService.
 * Phase4.032 FIX: Exposes per-currency breakdown matching frontend types.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSnapshot {
    private Instant computedAt;
    private String userId;

    // Phase4.032: Structured currency-based metrics to eliminate flat currency summations
    private Map<String, CurrencyBreakdown> netWorthByCurrency;
    private Map<String, BigDecimal> totalInvestmentValueByCurrency;
    private Map<String, BigDecimal> totalSavingsProgressByCurrency;

    // Budgets (count across all categories/currencies)
    private int budgetsOverLimit;
    private int budgetsNearLimit; // > 80%

    // Stale accounts
    private List<String> staleAccountIds;

    // Spending by category this month (aggregates absolute values across currencies? 
    // Actually, to be safe we should return spending by category by currency, OR maintain simple string keys 
    // where the client selects which to display. Let's return Map<String, Map<String, BigDecimal>> or keep Map<String, BigDecimal>).
    // The audit says "spending-by-category aggregation (use JPQL GROUP BY category)". Let's keep it as is or group by category and currency.
    // Since we want to be fully correct, let's make it Map<String, BigDecimal> but filter/sum only for currency or provide a multi-level map.
    // Let's check: frontend types.ts only has Record<string, number> for spendingByCategory.
    // To keep it clean, let's provide a currency breakdown for spending by category too! Or Map<String, BigDecimal>.
    // Let's just keep spendingByCategory as Map<String, BigDecimal> since it's typically viewed within a single currency context, 
    // but let's group by category for the primary dashboard currency or store it as a Map<String, Map<String, BigDecimal>> where outer key is currency.
    // Let's stick to: Map<String, BigDecimal> spendingByCategory representing the most active/base currency, 
    // or Map<String, Map<String, BigDecimal>> spendingByCategoryByCurrency for absolute correctness! 
    // Let's use Map<String, Map<String, BigDecimal>> spendingByCategoryByCurrency.
    private Map<String, Map<String, BigDecimal>> spendingByCategoryByCurrency;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CurrencyBreakdown {
        private BigDecimal total;
        private BigDecimal assets;
        private BigDecimal liabilities;
        private BigDecimal income;
        private BigDecimal expenses;
        private BigDecimal change; // Percentage or absolute change, defaulted to ZERO if unavailable
        private BigDecimal savingsRate; // calculated per currency
    }
}
