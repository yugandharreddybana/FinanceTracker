package com.financetracker.service;

import com.financetracker.model.AppUser;
import com.financetracker.model.PlanTier;
import com.financetracker.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final AppUserRepository userRepository;
    private final PlanLimitService planLimitService;
    private final AiUsageService aiUsageService;

    @Transactional(readOnly = true)
    public Map<String, Object> getSummary(String userId) {
        AppUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Map<String, Object> summary = planLimitService.buildUsageSummary(userId);
        summary.put("ai", aiUsageService.getUsageInfo(userId));
        summary.put("subscriptionStatus", user.getSubscriptionStatus());
        summary.put("currentPeriodEnd", user.getCurrentPeriodEnd() != null ? user.getCurrentPeriodEnd().toString() : null);
        summary.put("billingCurrency", user.getBillingCurrency());
        summary.put("stripeCustomerId", user.getStripeCustomerId());
        return summary;
    }

    @Transactional
    public void syncFromStripe(String userId, PlanTier tier, String stripeCustomerId,
                               String stripeSubscriptionId, String status,
                               Instant currentPeriodEnd, String billingCurrency) {
        AppUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setPlanTier(tier);
        if (stripeCustomerId != null) user.setStripeCustomerId(stripeCustomerId);
        if (stripeSubscriptionId != null) user.setStripeSubscriptionId(stripeSubscriptionId);
        user.setSubscriptionStatus(status);
        user.setCurrentPeriodEnd(currentPeriodEnd);
        if (billingCurrency != null) user.setBillingCurrency(billingCurrency.toUpperCase());
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getStripeIds(String userId) {
        AppUser user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Map<String, String> ids = new LinkedHashMap<>();
        ids.put("stripeCustomerId", user.getStripeCustomerId());
        ids.put("stripeSubscriptionId", user.getStripeSubscriptionId());
        ids.put("email", user.getEmail());
        return ids;
    }
}
