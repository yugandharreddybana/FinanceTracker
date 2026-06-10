package com.financetracker.service;

import com.financetracker.model.Budget;
import com.financetracker.model.BankAccount;
import com.financetracker.model.DashboardSnapshot;
import com.financetracker.model.DashboardSnapshot.CurrencyBreakdown;
import com.financetracker.model.UserProfile;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ISSUE #14 FIX: Computes net worth and financial health snapshot atomically
 * in a single read transaction. Never assembled from multiple frontend calls.
 * 
 * Phase4.032 + 4.033 + 4.034 FIX:
 * - Enforces currency alignment using per-currency maps.
 * - Loads transactions by monthly date range directly from database instead of heap-filtering.
 * - Normalizes account stale-checks and current month spans to the user's local IANA timezone.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {
    private final BankAccountRepository bankRepo;
    private final LoanRepository loanRepo;
    private final InvestmentRepository investmentRepo;
    private final SavingsGoalRepository savingsRepo;
    private final TransactionRepository txRepo;
    private final BudgetRepository budgetRepo;
    private final UserProfileRepository userProfileRepo;

    @Transactional(readOnly = true)
    public DashboardSnapshot getSnapshot(String userId) {
        // Phase4.034: Read user preferences for currency default and local timezone
        String userTimezone = "UTC";
        String userPreferredCurrency = "USD";
        Optional<UserProfile> profileOpt = userProfileRepo.findById(userId);
        if (profileOpt.isPresent()) {
            UserProfile profile = profileOpt.get();
            if (profile.getTimezone() != null && !profile.getTimezone().isBlank()) {
                userTimezone = profile.getTimezone();
            }
            if (profile.getPreferences() != null && profile.getPreferences().get("currency") != null) {
                userPreferredCurrency = profile.getPreferences().get("currency").toString();
            }
        }

        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(userTimezone);
        } catch (Exception e) {
            zoneId = ZoneOffset.UTC;
        }

        // Compute boundary dates in user's timezone for accurate monthly bounds
        ZonedDateTime nowUser = Instant.now().atZone(zoneId);
        LocalDate localToday = nowUser.toLocalDate();
        LocalDate monthStart = localToday.withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);

        Map<String, CurrencyBreakdown> netWorthByCurrency = new HashMap<>();
        Map<String, BigDecimal> totalInvestmentValueByCurrency = new HashMap<>();
        Map<String, BigDecimal> totalSavingsProgressByCurrency = new HashMap<>();

        // Phase4.032: Process Assets (Bank Accounts) grouped by currency
        final String finalPreferred = userPreferredCurrency;
        bankRepo.findAllByUserId(userId).stream()
            .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
            .forEach(a -> {
                String ccy = getNormalizedCurrency(a.getCurrency(), finalPreferred);
                CurrencyBreakdown breakdown = netWorthByCurrency.computeIfAbsent(ccy, k -> createEmptyBreakdown());
                BigDecimal balance = a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO;
                
                if (!"Credit".equalsIgnoreCase(a.getType())) {
                    breakdown.setAssets(breakdown.getAssets().add(balance));
                    breakdown.setTotal(breakdown.getTotal().add(balance));
                } else {
                    // Credit card liability
                    BigDecimal absVal = balance.abs();
                    breakdown.setLiabilities(breakdown.getLiabilities().add(absVal));
                    breakdown.setTotal(breakdown.getTotal().subtract(absVal));
                }
            });

        // Phase4.032: Process Liabilities (Loans) grouped by currency
        loanRepo.findAllByUserId(userId).stream()
            .forEach(l -> {
                String ccy = getNormalizedCurrency(l.getCurrency(), finalPreferred);
                CurrencyBreakdown breakdown = netWorthByCurrency.computeIfAbsent(ccy, k -> createEmptyBreakdown());
                BigDecimal rem = l.getRemainingAmount() != null ? l.getRemainingAmount() : BigDecimal.ZERO;
                
                breakdown.setLiabilities(breakdown.getLiabilities().add(rem));
                breakdown.setTotal(breakdown.getTotal().subtract(rem));
            });

        // Phase4.032: Process Investments grouped by currency
        investmentRepo.findAllByUserId(userId).stream()
            .filter(i -> !Boolean.TRUE.equals(i.getDeleted()))
            .forEach(i -> {
                String ccy = getNormalizedCurrency(i.getCurrency(), finalPreferred);
                CurrencyBreakdown breakdown = netWorthByCurrency.computeIfAbsent(ccy, k -> createEmptyBreakdown());
                
                BigDecimal val = BigDecimal.ZERO;
                if (i.getCurrentPrice() != null && i.getQuantity() != null) {
                    val = i.getCurrentPrice().multiply(i.getQuantity());
                }
                
                breakdown.setAssets(breakdown.getAssets().add(val));
                breakdown.setTotal(breakdown.getTotal().add(val));
                
                totalInvestmentValueByCurrency.put(ccy, 
                    totalInvestmentValueByCurrency.getOrDefault(ccy, BigDecimal.ZERO).add(val));
            });

        // Phase4.032: Process Savings Goals grouped by currency
        savingsRepo.findAllByUserId(userId).stream()
            .filter(g -> !Boolean.TRUE.equals(g.getDeleted()))
            .forEach(g -> {
                String ccy = getNormalizedCurrency(g.getCurrency(), finalPreferred);
                BigDecimal cur = g.getCurrent() != null ? g.getCurrent() : BigDecimal.ZERO;
                
                totalSavingsProgressByCurrency.put(ccy, 
                    totalSavingsProgressByCurrency.getOrDefault(ccy, BigDecimal.ZERO).add(cur));
            });

        // Phase4.033: Fetch transactions for the current month ONLY, directly using range query
        List<com.financetracker.model.Transaction> monthTxs = txRepo
            .findAllByUserIdAndTransactionDateBetweenAndStatusNot(userId, monthStart, monthEnd, "VOIDED");

        Map<String, Map<String, BigDecimal>> spendingByCategoryByCurrency = new HashMap<>();

        // Phase4.032 & 4.033: Process current month metrics across currencies
        monthTxs.forEach(t -> {
            String ccy = getNormalizedCurrency(t.getCurrency(), finalPreferred);
            CurrencyBreakdown breakdown = netWorthByCurrency.computeIfAbsent(ccy, k -> createEmptyBreakdown());
            BigDecimal amount = t.getAmount() != null ? t.getAmount().abs() : BigDecimal.ZERO;
            
            if ("INCOME".equalsIgnoreCase(t.getType())) {
                breakdown.setIncome(breakdown.getIncome().add(amount));
            } else if ("EXPENSE".equalsIgnoreCase(t.getType())) {
                breakdown.setExpenses(breakdown.getExpenses().add(amount));
                
                if (t.getCategory() != null && !t.getCategory().isBlank()) {
                    Map<String, BigDecimal> catMap = spendingByCategoryByCurrency
                        .computeIfAbsent(ccy, k -> new HashMap<>());
                    catMap.put(t.getCategory(), catMap.getOrDefault(t.getCategory(), BigDecimal.ZERO).add(amount));
                }
            }
        });

        // Finalize metrics (like savings rate) for each currency active in breakdown
        netWorthByCurrency.forEach((ccy, brk) -> {
            if (brk.getIncome().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal flow = brk.getIncome().subtract(brk.getExpenses());
                BigDecimal rate = flow.divide(brk.getIncome(), 4, RoundingMode.HALF_EVEN)
                    .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_EVEN);
                brk.setSavingsRate(rate);
            } else {
                brk.setSavingsRate(BigDecimal.ZERO);
            }
        });

        // Budget health status (count-based, across currencies)
        List<Budget> budgets = budgetRepo.findAllByUserId(userId);
        long overLimit = budgets.stream().filter(b -> {
            if (b.getSpent() == null || b.getLimit() == null) return false;
            return b.getSpent().compareTo(b.getLimit()) > 0;
        }).count();
        
        long nearLimit = budgets.stream().filter(b -> {
            if (b.getSpent() == null || b.getLimit() == null || b.getLimit().compareTo(BigDecimal.ZERO) == 0) return false;
            BigDecimal pct = b.getSpent().divide(b.getLimit(), 4, RoundingMode.HALF_EVEN)
                .multiply(BigDecimal.valueOf(100));
            return pct.compareTo(BigDecimal.valueOf(80)) >= 0 && pct.compareTo(BigDecimal.valueOf(100)) < 0;
        }).count();

        // Phase4.034: Account sync check using the user's wall clock 24-hour delta
        Instant cutoff = nowUser.minus(24, ChronoUnit.HOURS).toInstant();
        List<String> staleIds = bankRepo.findAllByUserId(userId).stream()
            .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
            .filter(a -> a.getLastSynced() == null || a.getLastSynced().isBefore(cutoff))
            .map(BankAccount::getId)
            .toList();

        return DashboardSnapshot.builder()
            .computedAt(Instant.now())
            .userId(userId)
            .netWorthByCurrency(netWorthByCurrency)
            .totalInvestmentValueByCurrency(totalInvestmentValueByCurrency)
            .totalSavingsProgressByCurrency(totalSavingsProgressByCurrency)
            .budgetsOverLimit((int) overLimit)
            .budgetsNearLimit((int) nearLimit)
            .staleAccountIds(staleIds)
            .spendingByCategoryByCurrency(spendingByCategoryByCurrency)
            .build();
    }

    private String getNormalizedCurrency(String ccy, String defaultPreferred) {
        if (ccy != null && !ccy.isBlank()) {
            return ccy.trim().toUpperCase();
        }
        if (defaultPreferred != null && !defaultPreferred.isBlank()) {
            return defaultPreferred.trim().toUpperCase();
        }
        return "USD"; // Absolute boundary fallback
    }

    private CurrencyBreakdown createEmptyBreakdown() {
        return CurrencyBreakdown.builder()
            .total(BigDecimal.ZERO)
            .assets(BigDecimal.ZERO)
            .liabilities(BigDecimal.ZERO)
            .income(BigDecimal.ZERO)
            .expenses(BigDecimal.ZERO)
            .change(BigDecimal.ZERO)
            .savingsRate(BigDecimal.ZERO)
            .build();
    }
}
