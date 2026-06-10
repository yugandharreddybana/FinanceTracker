package com.financetracker.scheduler;

import com.financetracker.model.Budget;
import com.financetracker.model.UserProfile;
import com.financetracker.repository.BudgetRepository;
import com.financetracker.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Phase5.0009: per-user month-end rollover.
 * Runs hourly (00 UTC of every hour) and only rolls budgets for users whose
 * local time is the first of the month between 00:00 and 00:59. This avoids
 * the prior bug where a UTC 00:05 cron rolled budgets for users in UTC-12 on
 * the last day of THEIR month.
 *
 * Each user's budgets are processed at most once per local-month transition.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BudgetRolloverScheduler {
    private final BudgetRepository budgetRepo;
    private final UserProfileRepository userRepo;

    @Scheduled(cron = "0 0 * * * *", zone = "UTC")
    @Transactional
    public void rolloverBudgets() {
        java.util.List<String> validZones = new java.util.ArrayList<>();
        boolean utcIsRolling = false;

        for (String zoneId : ZoneId.getAvailableZoneIds()) {
            try {
                ZoneId idObj = ZoneId.of(zoneId);
                ZonedDateTime localNow = ZonedDateTime.now(idObj);
                if (localNow.getDayOfMonth() == 1 && localNow.getHour() == 0) {
                    validZones.add(zoneId);
                    if (java.time.ZoneOffset.UTC.equals(idObj.getRules().getOffset(java.time.Instant.now())) || "UTC".equalsIgnoreCase(zoneId)) {
                        utcIsRolling = true;
                    }
                }
            } catch (Exception ignored) {}
        }

        if (validZones.isEmpty() && !utcIsRolling) {
            return; // No zone is currently in the rollover window
        }

        // If validZones is empty but utcIsRolling is true, pass a placeholder string to avoid empty SQL IN lists
        java.util.List<String> queryZones = validZones.isEmpty() ? java.util.List.of("DUMMY_ZONE_HOLDER") : validZones;

        List<UserProfile> users = userRepo.findByTimezoneInOrNull(queryZones, utcIsRolling);
        int rolled = 0;
        for (UserProfile user : users) {
            ZoneId zone = parseZone(user.getTimezone());
            ZonedDateTime localNow = ZonedDateTime.now(zone);
            // Extra safety guard to ensure double-execution prevention
            if (localNow.getDayOfMonth() != 1 || localNow.getHour() != 0) continue;
            rolled += rolloverForUser(user.getId(), localNow.toLocalDate());
        }
        if (rolled > 0) log.info("[BudgetRolloverScheduler] Rolled {} budgets across users", rolled);
    }

    private int rolloverForUser(String userId, LocalDate newStart) {
        LocalDate newEnd = newStart.plusMonths(1).minusDays(1);
        // ISSUE 4.056 FIX: Query only active budgets to avoid redundant processing of deleted ones.
        List<Budget> budgets = budgetRepo.findAllByUserIdAndDeletedFalse(userId).stream()
            .filter(b -> b.getPeriodType() == Budget.PeriodType.MONTHLY)
            // Idempotency: don't re-roll if already on this period
            .filter(b -> b.getPeriodStart() == null || !b.getPeriodStart().equals(newStart))
            .toList();
        for (Budget b : budgets) {
            BigDecimal spent = b.getSpent() != null ? b.getSpent() : BigDecimal.ZERO;
            BigDecimal limit = b.getLimit() != null ? b.getLimit() : BigDecimal.ZERO;
            BigDecimal unspent = limit.subtract(spent).max(BigDecimal.ZERO);
            if (Boolean.TRUE.equals(b.getRolloverEnabled())) {
                b.setRolloverAmount(unspent);
            }
            b.resetSpent();
            b.setPeriodStart(newStart);
            b.setPeriodEnd(newEnd);
            budgetRepo.save(b);
        }
        return budgets.size();
    }

    private ZoneId parseZone(String tz) {
        if (tz == null || tz.isBlank()) return ZoneId.of("UTC");
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneId.of("UTC");
        }
    }
}
