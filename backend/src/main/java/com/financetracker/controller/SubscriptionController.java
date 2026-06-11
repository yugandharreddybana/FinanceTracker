package com.financetracker.controller;

import com.financetracker.model.PlanTier;
import com.financetracker.service.AiUsageService;
import com.financetracker.service.SubscriptionService;
import com.financetracker.util.Guards;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final AiUsageService aiUsageService;

    @Value("${subscription.sync-secret:}")
    private String syncSecret;

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return subscriptionService.getSummary(userId);
    }

    @PostMapping("/consume-ai")
    public ResponseEntity<Map<String, Object>> consumeAi(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        aiUsageService.consumeOne(userId);
        return ResponseEntity.ok(aiUsageService.getUsageInfo(userId));
    }

    @PutMapping("/sync")
    public ResponseEntity<Void> sync(@RequestBody SyncRequest request,
                                     @RequestHeader(value = "X-Subscription-Sync-Secret", required = false) String secret) {
        assertSystemCaller(secret);
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }
        PlanTier tier = PlanTier.fromString(request.getPlanTier());
        subscriptionService.syncFromStripe(
            request.getUserId(),
            tier,
            request.getStripeCustomerId(),
            request.getStripeSubscriptionId(),
            request.getSubscriptionStatus(),
            request.getCurrentPeriodEnd() != null ? Instant.parse(request.getCurrentPeriodEnd()) : null,
            request.getBillingCurrency()
        );
        return ResponseEntity.ok().build();
    }

    private void assertSystemCaller(String secret) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean systemJwt = auth != null && "system-internal".equals(auth.getPrincipal());
        boolean validSecret = syncSecret != null && !syncSecret.isBlank()
            && syncSecret.equals(secret);
        if (!systemJwt && !validSecret) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    @Data
    public static class SyncRequest {
        private String userId;
        private String planTier;
        private String stripeCustomerId;
        private String stripeSubscriptionId;
        private String subscriptionStatus;
        private String currentPeriodEnd;
        private String billingCurrency;
    }
}
