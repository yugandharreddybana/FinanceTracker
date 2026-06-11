package com.financetracker.service;

import com.financetracker.exception.PlanFeatureLockedException;
import com.financetracker.exception.PlanLimitExceededException;
import com.financetracker.model.*;
import com.financetracker.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanLimitServiceTest {

    @Mock private AppUserRepository userRepository;
    @Mock private BankAccountRepository bankAccountRepository;
    @Mock private BudgetRepository budgetRepository;
    @Mock private SavingsGoalRepository savingsGoalRepository;
    @Mock private LoanRepository loanRepository;
    @Mock private RecurringPaymentRepository recurringPaymentRepository;
    @Mock private InvestmentRepository investmentRepository;
    @Mock private IncomeSourceRepository incomeSourceRepository;
    @Mock private FamilyAccountRepository familyAccountRepository;

    @InjectMocks private PlanLimitService planLimitService;

    private static final String USER = "user-1";

    @BeforeEach
    void setupUser() {
        AppUser user = AppUser.builder().id(USER).planTier(PlanTier.FREE).build();
        when(userRepository.findById(USER)).thenReturn(Optional.of(user));
    }

    @Test
    void blocksInvestmentOnFree() {
        assertThrows(PlanFeatureLockedException.class,
            () -> planLimitService.assertCanCreate(USER, LimitableResource.INVESTMENT));
    }

    @Test
    void blocksFourthAccountOnFree() {
        when(bankAccountRepository.countByUserIdAndDeletedFalse(USER)).thenReturn(3L);
        assertThrows(PlanLimitExceededException.class,
            () -> planLimitService.assertCanCreate(USER, LimitableResource.BANK_ACCOUNT));
    }

    @Test
    void allowsAccountWhenUnderCap() {
        when(bankAccountRepository.countByUserIdAndDeletedFalse(USER)).thenReturn(2L);
        assertDoesNotThrow(() -> planLimitService.assertCanCreate(USER, LimitableResource.BANK_ACCOUNT));
    }

    @Test
    void proAllowsLoansUpToTen() {
        AppUser pro = AppUser.builder().id(USER).planTier(PlanTier.PRO).build();
        when(userRepository.findById(USER)).thenReturn(Optional.of(pro));
        when(loanRepository.countByUserIdAndDeletedFalse(USER)).thenReturn(9L);
        assertDoesNotThrow(() -> planLimitService.assertCanCreate(USER, LimitableResource.LOAN));
        when(loanRepository.countByUserIdAndDeletedFalse(USER)).thenReturn(10L);
        assertThrows(PlanLimitExceededException.class,
            () -> planLimitService.assertCanCreate(USER, LimitableResource.LOAN));
    }
}
