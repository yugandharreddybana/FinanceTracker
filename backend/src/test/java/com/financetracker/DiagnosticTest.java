package com.financetracker;

import com.financetracker.model.Transaction;
import com.financetracker.model.BankAccount;
import com.financetracker.service.TransactionService;
import com.financetracker.repository.BankAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SpringBootTest
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:diagnostic_db;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_UPPER=false;INIT=CREATE SCHEMA IF NOT EXISTS finance_app",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "JWT_SECRET=test-environment-only-dummy-signing-secret-minimum-length-check-satisfied-here"
})
public class DiagnosticTest {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private BankAccountRepository bankAccountRepository;

    @Test
    public void runDiagnostic() {
        System.out.println("--- START DIAGNOSTIC ---");
        String testUserId = "demo-user-id-placeholder"; // In real test this is extracted from active test user
        
        // First ensure we have a test account
        BankAccount account = new BankAccount();
        account.setId(UUID.randomUUID().toString());
        account.setUserId(testUserId);
        account.setName("Diagnostic Account");
        account.setType("Savings");
        account.setBalance(BigDecimal.valueOf(1000));
        account.setCurrency("INR");
        account.setDeleted(false);
        bankAccountRepository.save(account);

        System.out.println("Account saved: " + account.getId());

        // Build Transaction payload identical to Playwright test
        Transaction tx = new Transaction();
        tx.setUserId(testUserId);
        tx.setAccount(account.getId()); // Set explicitly
        tx.setMerchant("Payload Distribution Corp");
        tx.setAmount(BigDecimal.valueOf(75000));
        tx.setType("income");
        tx.setCategory("Salary");
        tx.setCurrency("INR");
        tx.setStatus("confirmed");
        
        // Simulating the date setter
        tx.setTransactionDate(LocalDate.parse("2026-05-10"));

        System.out.println("Attempting to save transaction...");
        try {
            transactionService.create(tx);
            System.out.println("SUCCESSFUL TRANSACTION CREATION!");
        } catch (Exception e) {
            System.err.println("CRASH REPRODUCED:");
            e.printStackTrace();
            throw e;
        }
    }
}
