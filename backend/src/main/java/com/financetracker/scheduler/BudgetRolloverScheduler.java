package com.financetracker.scheduler;

import com.financetracker.model.Budget;
import com.financetracker.repository.BudgetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

/**
 * ISSUE #9 FIX: Month-end budget rollover scheduler.
 * Runs at 00:05 UTC on the 1st of every month.
 * - Resets spent to zero for all MONTHLY budgets
 * - Advances periodStart/periodEnd to the new month
 * - Computes rolloverAmount (unspent from prior month) if rolloverEnabled = true
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BudgetRolloverScheduler {
    private final BudgetRepository budgetRepo;

    @Scheduled(cron = "0 5 0 1 * *", zone = "UTC")
    @Transactional
    public void rolloverBudgets() {
        LocalDate newStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
        LocalDate newEnd = newStart.plusMonths(1).minusDays(1);
        List<Budget> budgets = budgetRepo.findAllByPeriodType(Budget.PeriodType.MONTHLY);
        log.info("[BudgetRolloverScheduler] Rolling over {} budgets to period {}/{}",
            budgets.size(), newStart, newEnd);
        for (Budget b : budgets) {
            BigDecimal spent = b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO;
            BigDecimal limit = b.getLimit() != null ? b.getLimit() : BigDecimal.ZERO;
            BigDecimal unspent = limit.subtract(spent).max(BigDecimal.ZERO);
            if (Boolean.TRUE.equals(b.getRolloverEnabled())) {
                b.setRolloverAmount(unspent);
            }
            b.setSpentInternal(BigDecimal.ZERO);
            b.setPeriodStart(newStart);
            b.setPeriodEnd(newEnd);
            budgetRepo.save(b);
        }
        log.info("[BudgetRolloverScheduler] Rollover complete for {} budgets", budgets.size());
    }
}
