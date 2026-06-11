package com.financetracker.config;

import com.financetracker.model.AppUser;
import com.financetracker.model.PlanTier;
import com.financetracker.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAccountTierSeederTest {

    @Mock private AppUserRepository userRepository;
    @InjectMocks private AdminAccountTierSeeder seeder;

    private AppUser user;

    @BeforeEach
    void setup() {
        user = AppUser.builder()
            .id("user-demo")
            .email("demo@yugifinance.com")
            .planTier(PlanTier.FREE)
            .emailVerified(false)
            .subscriptionStatus(null)
            .build();
    }

    @Test
    void applyTierIfPresent_setsDemoToFree() {
        user.setPlanTier(PlanTier.ENTERPRISE);
        when(userRepository.findByEmailIgnoreCase("demo@yugifinance.com")).thenReturn(Optional.of(user));

        seeder.applyTierIfPresent("demo@yugifinance.com", PlanTier.FREE);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        AppUser saved = captor.getValue();
        assertEquals(PlanTier.FREE, saved.getPlanTier());
        assertTrue(saved.getEmailVerified());
        assertEquals("admin", saved.getSubscriptionStatus());
    }

    @Test
    void applyTierIfPresent_skipsMissingUser() {
        when(userRepository.findByEmailIgnoreCase("missing@yugifinance.com")).thenReturn(Optional.empty());

        seeder.applyTierIfPresent("missing@yugifinance.com", PlanTier.PRO);

        verify(userRepository, never()).save(any());
    }
}
