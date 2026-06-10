package com.financetracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.retry.annotation.EnableRetry;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * ISSUE #17 FIX: loadEnv() removed entirely.
 * Railway injects OS-level env vars which Spring Boot reads automatically
 * via @Value and application.properties. No manual System.setProperty() needed.
 * @EnableScheduling activates RecurringPaymentScheduler, BudgetRolloverScheduler,
 * and InvestmentPriceRefreshScheduler.
 */
@SpringBootApplication
@EnableScheduling
@EnableTransactionManagement
@EnableRetry
public class FinanceTrackerApplication {
    public static void main(String[] args) {
        SpringApplication.run(FinanceTrackerApplication.class, args);
    }
}
