package com.financetracker.service;

import com.financetracker.model.Budget;
import com.financetracker.model.BankAccount;
import com.financetracker.model.DashboardSnapshot;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ISSUE #14 FIX: Computes net worth and financial health snapshot atomically
 * in a single read transaction. Never assembled from multiple frontend calls.
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

    @Transactional(readOnly = true)
    public DashboardSnapshot getSnapshot(String userId) {
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);

        // Assets
        BigDecimal totalAssets = bankRepo.findAllByUserId(userId).stream()
            .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
            .map(a -> a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Liabilities
        BigDecimal totalLiabilities = loanRepo.findAllByUserId(userId).stream()
            .map(l -> l.getRemainingAmount() != null ? l.getRemainingAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Investments (current value = quantity * currentPrice)
        BigDecimal totalInvestmentValue = investmentRepo.findAllByUserId(userId).stream()
            .filter(i -> !Boolean.TRUE.equals(i.getDeleted()))
            .map(i -> (i.getCurrentPrice() != null && i.getQuantity() != null)
                ? i.getCurrentPrice().multiply(i.getQuantity())
                : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Savings progress
        BigDecimal totalSavingsProgress = savingsRepo.findAllByUserId(userId).stream()
            .filter(g -> !Boolean.TRUE.equals(g.getDeleted()))
            .map(g -> g.getCurrent() != null ? g.getCurrent() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netWorth = totalAssets.add(totalInvestmentValue).subtract(totalLiabilities);

        // Monthly income/expenses from transaction ledger
        List<com.financetracker.model.Transaction> monthTxs = txRepo.findAllByUserId(userId).stream()
            .filter(t -> t.getTransactionDate() != null
                && !t.getTransactionDate().isBefore(monthStart)
                && !t.getTransactionDate().isAfter(monthEnd)
                && !"VOIDED".equals(t.getStatus()))
            .toList();

        BigDecimal monthlyIncome = monthTxs.stream()
            .filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
            .map(t -> t.getAmount() != null ? t.getAmount().abs() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthlyExpenses = monthTxs.stream()
            .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
            .map(t -> t.getAmount() != null ? t.getAmount().abs() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthlyCashFlow = monthlyIncome.subtract(monthlyExpenses);
        BigDecimal savingsRate = monthlyIncome.compareTo(BigDecimal.ZERO) > 0
            ? monthlyCashFlow.divide(monthlyIncome, 4, RoundingMode.HALF_EVEN)
                .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_EVEN)
            : BigDecimal.ZERO;

        // Budget health
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

        // Stale accounts (not synced in 24h)
        List<String> staleIds = bankRepo.findAllByUserId(userId).stream()
            .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
            .filter(a -> a.getLastSynced() == null ||
                a.getLastSynced().isBefore(Instant.now().minusSeconds(86400)))
            .map(BankAccount::getId)
            .toList();

        // Spending by category this month
        Map<String, BigDecimal> byCategory = monthTxs.stream()
            .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()) && t.getCategory() != null)
            .collect(Collectors.groupingBy(
                com.financetracker.model.Transaction::getCategory,
                Collectors.reducing(BigDecimal.ZERO,
                    t -> t.getAmount() != null ? t.getAmount().abs() : BigDecimal.ZERO,
                    BigDecimal::add)
            ));

        return DashboardSnapshot.builder()
            .computedAt(Instant.now())
            .userId(userId)
            .totalAssets(totalAssets)
            .totalLiabilities(totalLiabilities)
            .netWorth(netWorth)
            .totalInvestmentValue(totalInvestmentValue)
            .totalSavingsProgress(totalSavingsProgress)
            .monthlyIncome(monthlyIncome)
            .monthlyExpenses(monthlyExpenses)
            .monthlyCashFlow(monthlyCashFlow)
            .savingsRate(savingsRate)
            .budgetsOverLimit((int) overLimit)
            .budgetsNearLimit((int) nearLimit)
            .staleAccountIds(staleIds)
            .spendingByCategory(byCategory)
            .build();
    }
}
