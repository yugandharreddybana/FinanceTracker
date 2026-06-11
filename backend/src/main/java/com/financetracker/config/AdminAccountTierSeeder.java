package com.financetracker.config;

import com.financetracker.model.AppUser;
import com.financetracker.model.PlanTier;
import com.financetracker.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class AdminAccountTierSeeder implements ApplicationRunner {

    static final Map<String, PlanTier> TIER_BY_EMAIL = Map.of(
        "demo@yugifinance.com", PlanTier.FREE,
        "yugi@example.com", PlanTier.ENTERPRISE,
        "free@yugifinance.com", PlanTier.FREE,
        "pro@yugifinance.com", PlanTier.PRO,
        "enterprise@yugifinance.com", PlanTier.ENTERPRISE
    );

    private final AppUserRepository userRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        TIER_BY_EMAIL.forEach(this::applyTierIfPresent);
    }

    void applyTierIfPresent(String email, PlanTier targetTier) {
        Optional<AppUser> opt = userRepository.findByEmailIgnoreCase(email);
        if (opt.isEmpty()) {
            log.debug("[seed] Admin tier skip — user not found: {}", email);
            return;
        }
        AppUser user = opt.get();
        boolean changed = false;
        if (user.getPlanTier() != targetTier) {
            user.setPlanTier(targetTier);
            changed = true;
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            changed = true;
        }
        if (!"admin".equals(user.getSubscriptionStatus())) {
            user.setSubscriptionStatus("admin");
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
            log.info("[seed] Admin tier applied: {} -> {}", email, targetTier);
        }
    }
}
