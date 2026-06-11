package com.financetracker.service;

import com.financetracker.config.PlanLimitsConfig;
import com.financetracker.exception.AiQuotaExceededException;
import com.financetracker.model.AiUsageMonthly;
import com.financetracker.model.PlanTier;
import com.financetracker.repository.AiUsageMonthlyRepository;
import com.financetracker.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiUsageService {

    private final AiUsageMonthlyRepository usageRepository;
    private final AppUserRepository userRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getUsageInfo(String userId) {
        PlanTier tier = userRepository.findById(userId)
            .map(u -> u.getPlanTier() != null ? u.getPlanTier() : PlanTier.FREE)
            .orElse(PlanTier.FREE);
        Integer limit = PlanLimitsConfig.getAiMonthlyLimit(tier);
        int used = getCurrentCount(userId);
        Map<String, Object> ai = new LinkedHashMap<>();
        ai.put("used", used);
        ai.put("limit", limit);
        ai.put("remaining", limit == null ? null : Integer.valueOf(Math.max(0, limit - used)));
        ai.put("resetsAt", nextMonthStart().toString());
        return ai;
    }

    @Transactional
    public void consumeOne(String userId) {
        PlanTier tier = userRepository.findById(userId)
            .map(u -> u.getPlanTier() != null ? u.getPlanTier() : PlanTier.FREE)
            .orElse(PlanTier.FREE);
        Integer limit = PlanLimitsConfig.getAiMonthlyLimit(tier);
        if (limit == null) return;

        String yearMonth = currentYearMonth();
        AiUsageMonthly row = usageRepository.findForUpdate(userId, yearMonth)
            .orElseGet(() -> AiUsageMonthly.builder()
                .userId(userId)
                .yearMonth(yearMonth)
                .usageCount(0)
                .updatedAt(Instant.now())
                .build());

        if (row.getUsageCount() >= limit) {
            throw new AiQuotaExceededException(row.getUsageCount(), limit, nextMonthStart());
        }
        row.setUsageCount(row.getUsageCount() + 1);
        row.setUpdatedAt(Instant.now());
        usageRepository.save(row);
    }

    private int getCurrentCount(String userId) {
        return usageRepository.findById(new com.financetracker.model.AiUsageMonthlyId(userId, currentYearMonth()))
            .map(AiUsageMonthly::getUsageCount)
            .orElse(0);
    }

    private static String currentYearMonth() {
        return YearMonth.now(ZoneOffset.UTC).toString();
    }

    private static Instant nextMonthStart() {
        return YearMonth.now(ZoneOffset.UTC)
            .plusMonths(1)
            .atDay(1)
            .atStartOfDay(ZoneOffset.UTC)
            .toInstant();
    }
}
