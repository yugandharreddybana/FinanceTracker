package com.financetracker.config;



import com.financetracker.model.BankAccount;

import com.financetracker.model.Budget;

import com.financetracker.model.IncomeSource;

import com.financetracker.model.Investment;

import com.financetracker.model.Loan;

import com.financetracker.model.RecurringPayment;

import com.financetracker.model.SavingsGoal;

import com.financetracker.model.Transaction;

import com.financetracker.repository.AppUserRepository;

import com.financetracker.repository.BankAccountRepository;

import com.financetracker.repository.BudgetRepository;

import com.financetracker.repository.IncomeSourceRepository;

import com.financetracker.repository.InvestmentRepository;

import com.financetracker.repository.LoanRepository;

import com.financetracker.repository.RecurringPaymentRepository;

import com.financetracker.repository.SavingsGoalRepository;

import com.financetracker.repository.TransactionRepository;

import com.financetracker.service.TransactionService;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.ApplicationArguments;

import org.springframework.boot.ApplicationRunner;

import org.springframework.core.annotation.Order;

import org.springframework.stereotype.Component;

import org.springframework.transaction.annotation.Transactional;



import java.math.BigDecimal;

import java.time.LocalDate;

import java.util.List;

import java.util.Optional;



@Slf4j

@Component

@Order(2)

@RequiredArgsConstructor

public class DemoSampleDataSeeder implements ApplicationRunner {



    static final String DEMO_EMAIL = "demo@yugifinance.com";

    static final String INR_ACCOUNT_ID = "demo-seed-acc-inr";

    static final String EUR_ACCOUNT_ID = "demo-seed-acc-eur";



    private final AppUserRepository userRepository;

    private final BankAccountRepository bankAccountRepository;

    private final BudgetRepository budgetRepository;

    private final TransactionRepository transactionRepository;

    private final SavingsGoalRepository savingsGoalRepository;

    private final LoanRepository loanRepository;

    private final RecurringPaymentRepository recurringPaymentRepository;

    private final IncomeSourceRepository incomeSourceRepository;

    private final InvestmentRepository investmentRepository;

    private final TransactionService transactionService;



    @Override

    public void run(ApplicationArguments args) {

        for (int attempt = 1; attempt <= 3; attempt++) {

            if (trySeed()) {

                return;

            }

            try {

                Thread.sleep(2000L);

            } catch (InterruptedException e) {

                Thread.currentThread().interrupt();

                return;

            }

        }

        log.debug("[seed] Demo sample data skipped — demo user not ready yet");

    }



    @Transactional

    boolean trySeed() {

        Optional<com.financetracker.model.AppUser> demoUser = userRepository.findByEmailIgnoreCase(DEMO_EMAIL);

        if (demoUser.isEmpty()) {

            return false;

        }

        String userId = demoUser.get().getId();



        seedBankAccounts(userId);

        seedBudgets(userId);

        seedSampleTransactions(userId);

        seedSavingsGoals(userId);

        seedLoans(userId);

        seedRecurringPayments(userId);

        seedIncomeSources(userId);

        seedInvestments(userId);

        syncDemoBudgetSpent(userId);

        log.info("[seed] Demo workspace synced for {}", DEMO_EMAIL);

        return true;

    }



    private void seedBankAccounts(String userId) {

        upsertAccount(userId, BankAccount.builder()

            .id(INR_ACCOUNT_ID)

            .userId(userId)

            .name("HDFC Savings")

            .type("Savings")

            .bank("HDFC Bank")

            .currency("INR")

            .balance(new BigDecimal("125000.00"))

            .isPrimary(true)

            .version(0L)

            .deleted(false)

            .build());

        upsertAccount(userId, BankAccount.builder()

            .id(EUR_ACCOUNT_ID)

            .userId(userId)

            .name("N26 Main")

            .type("Checking")

            .bank("N26")

            .currency("EUR")

            .balance(new BigDecimal("4200.00"))

            .isPrimary(false)

            .version(0L)

            .deleted(false)

            .build());

    }



    private void upsertAccount(String userId, BankAccount account) {

        if (bankAccountRepository.findById(account.getId()).filter(a -> userId.equals(a.getUserId())).isPresent()) {

            return;

        }

        bankAccountRepository.save(account);

    }



    private void seedBudgets(String userId) {

        LocalDate today = LocalDate.now();

        LocalDate periodStart = today.withDayOfMonth(1);

        LocalDate periodEnd = today.withDayOfMonth(today.lengthOfMonth());



        List<BudgetSeed> rows = List.of(

            new BudgetSeed("demo-seed-budget-food-inr", "Food & Dining", "🍔", "#10b981", new BigDecimal("8000"), "INR"),

            new BudgetSeed("demo-seed-budget-shop-inr", "Shopping", "🛒", "#ef4444", new BigDecimal("10000"), "INR"),

            new BudgetSeed("demo-seed-budget-transport-inr", "Transport", "🚗", "#f59e0b", new BigDecimal("5000"), "INR"),

            new BudgetSeed("demo-seed-budget-subs-inr", "Subscriptions", "📺", "#8b5cf6", new BigDecimal("2000"), "INR"),

            new BudgetSeed("demo-seed-budget-housing-inr", "Housing", "🏠", "#6366f1", new BigDecimal("25000"), "INR"),

            new BudgetSeed("demo-seed-budget-food-eur", "Food & Dining", "🥗", "#10b981", new BigDecimal("400"), "EUR"),

            new BudgetSeed("demo-seed-budget-transport-eur", "Transport", "🚆", "#3b82f6", new BigDecimal("200"), "EUR"),

            new BudgetSeed("demo-seed-budget-shop-eur", "Shopping", "🛍️", "#ec4899", new BigDecimal("500"), "EUR"),

            new BudgetSeed("demo-seed-budget-subs-eur", "Subscriptions", "🎵", "#a855f7", new BigDecimal("50"), "EUR")

        );



        for (BudgetSeed row : rows) {

            if (budgetRepository.findById(row.id).filter(b -> userId.equals(b.getUserId())).isPresent()) {

                continue;

            }

            Budget budget = Budget.builder()

                .id(row.id)

                .userId(userId)

                .category(row.category)

                .emoji(row.emoji)

                .color(row.color)

                .limit(row.limit)

                .currency(row.currency)

                .periodType(Budget.PeriodType.MONTHLY)

                .periodStart(periodStart)

                .periodEnd(periodEnd)

                .rolloverEnabled(false)

                .deleted(false)

                .build();

            budget.resetSpent();

            budgetRepository.save(budget);

        }

    }



    private void seedSampleTransactions(String userId) {

        List<SampleRow> rows = List.of(

            new SampleRow("demo-seed-001", "Salary — Acme Corp", "income", "Salary", new BigDecimal("85000"), "INR", INR_ACCOUNT_ID, -30),

            new SampleRow("demo-seed-002", "Freelance — Design project", "income", "Freelance", new BigDecimal("12000"), "INR", INR_ACCOUNT_ID, -25),

            new SampleRow("demo-seed-003", "Swiggy", "expense", "Food & Dining", new BigDecimal("450"), "INR", INR_ACCOUNT_ID, -3),

            new SampleRow("demo-seed-004", "Amazon India", "expense", "Shopping", new BigDecimal("2899"), "INR", INR_ACCOUNT_ID, -7),

            new SampleRow("demo-seed-005", "Uber", "expense", "Transport", new BigDecimal("320"), "INR", INR_ACCOUNT_ID, -2),

            new SampleRow("demo-seed-006", "Netflix", "expense", "Subscriptions", new BigDecimal("649"), "INR", INR_ACCOUNT_ID, -14),

            new SampleRow("demo-seed-007", "Monthly rent", "expense", "Housing", new BigDecimal("22000"), "INR", INR_ACCOUNT_ID, -10),

            new SampleRow("demo-seed-008", "Client payment — EU", "income", "Freelance", new BigDecimal("1200"), "EUR", EUR_ACCOUNT_ID, -20),

            new SampleRow("demo-seed-009", "REWE Groceries", "expense", "Food & Dining", new BigDecimal("67.40"), "EUR", EUR_ACCOUNT_ID, -4),

            new SampleRow("demo-seed-010", "Deutsche Bahn", "expense", "Transport", new BigDecimal("49.90"), "EUR", EUR_ACCOUNT_ID, -6),

            new SampleRow("demo-seed-011", "Spotify", "expense", "Subscriptions", new BigDecimal("9.99"), "EUR", EUR_ACCOUNT_ID, -12),

            new SampleRow("demo-seed-012", "IKEA", "expense", "Shopping", new BigDecimal("189.50"), "EUR", EUR_ACCOUNT_ID, -8)

        );



        LocalDate today = LocalDate.now();

        for (SampleRow row : rows) {

            if (transactionRepository.findByUserIdAndIdempotencyKey(userId, row.idempotencyKey).isPresent()) {

                continue;

            }

            Transaction tx = Transaction.builder()

                .id("tx-" + row.idempotencyKey)

                .userId(userId)

                .idempotencyKey(row.idempotencyKey)

                .transactionDate(today.plusDays(row.daysAgo))

                .merchant(row.merchant)

                .amount(row.amount)

                .category(row.category)

                .type(row.type)

                .status("confirmed")

                .aiTag("demo:sample")

                .account(row.accountId)

                .currency(row.currency)

                .confidence(new BigDecimal("1.00"))

                .build();

            transactionService.create(tx);

        }

    }



    private void seedSavingsGoals(String userId) {

        upsertGoal(userId, SavingsGoal.builder()

            .id("demo-seed-goal-emergency")

            .userId(userId)

            .name("Emergency Fund")

            .target(new BigDecimal("300000"))

            .emoji("🛡️")

            .deadline(LocalDate.now().plusYears(1).toString())

            .isHero(true)

            .currency("INR")

            .deleted(false)

            .build(), new BigDecimal("85000"));

        upsertGoal(userId, SavingsGoal.builder()

            .id("demo-seed-goal-vacation")

            .userId(userId)

            .name("Europe Trip 2027")

            .target(new BigDecimal("250000"))

            .emoji("✈️")

            .deadline("2027-06-30")

            .isHero(false)

            .currency("INR")

            .deleted(false)

            .build(), new BigDecimal("62000"));

        upsertGoal(userId, SavingsGoal.builder()

            .id("demo-seed-goal-eur-buffer")

            .userId(userId)

            .name("EUR Buffer")

            .target(new BigDecimal("5000"))

            .emoji("💶")

            .deadline(LocalDate.now().plusMonths(8).toString())

            .isHero(false)

            .currency("EUR")

            .deleted(false)

            .build(), new BigDecimal("1800"));

    }



    private void upsertGoal(String userId, SavingsGoal goal, BigDecimal current) {

        Optional<SavingsGoal> existing = savingsGoalRepository.findById(goal.getId())

            .filter(g -> userId.equals(g.getUserId()));

        if (existing.isPresent()) {

            return;

        }

        goal.setCurrentInternal(current);

        savingsGoalRepository.save(goal);

    }



    private void seedLoans(String userId) {

        if (loanRepository.findById("demo-seed-loan-home").filter(l -> userId.equals(l.getUserId())).isPresent()) {

            return;

        }

        loanRepository.save(Loan.builder()
            .id("demo-seed-loan-home")
            .userId(userId)
            .name("Home Mortgage")
            .totalAmount(new BigDecimal("4500000"))
            .remainingAmount(new BigDecimal("4120000"))
            .monthlyEMI(new BigDecimal("38500"))
            .interestRate(new BigDecimal("8.50"))
            .tenureYears(20)
            .startDate("2019-04-01")
            .endDate("2039-04-01")
            .category("Housing")
            .color("#6366f1")
            .currency("INR")
            .payments(List.of())
            .deleted(false)
            .build());

    }



    private void seedRecurringPayments(String userId) {

        upsertRecurring(userId, RecurringPayment.builder()

            .id("demo-seed-rec-rent")

            .userId(userId)

            .name("Monthly Rent")

            .amount(new BigDecimal("22000"))

            .dayOfMonth(1)

            .category("Housing")

            .frequency("Monthly")

            .status("Active")

            .currency("INR")

            .description("Apartment lease")

            .paymentMethod("Bank transfer")

            .deleted(false)

            .build());

        upsertRecurring(userId, RecurringPayment.builder()

            .id("demo-seed-rec-netflix")

            .userId(userId)

            .name("Netflix")

            .amount(new BigDecimal("649"))

            .dayOfMonth(15)

            .category("Subscriptions")

            .frequency("Monthly")

            .status("Active")

            .currency("INR")

            .description("Premium plan")

            .paymentMethod("Credit card")

            .deleted(false)

            .build());

        upsertRecurring(userId, RecurringPayment.builder()

            .id("demo-seed-rec-spotify")

            .userId(userId)

            .name("Spotify")

            .amount(new BigDecimal("9.99"))

            .dayOfMonth(12)

            .category("Subscriptions")

            .frequency("Monthly")

            .status("Active")

            .currency("EUR")

            .description("Family plan")

            .paymentMethod("Debit card")

            .deleted(false)

            .build());

    }



    private void upsertRecurring(String userId, RecurringPayment payment) {

        if (recurringPaymentRepository.findById(payment.getId()).filter(p -> userId.equals(p.getUserId())).isPresent()) {

            return;

        }

        recurringPaymentRepository.save(payment);

    }



    private void seedIncomeSources(String userId) {

        LocalDate today = LocalDate.now();

        upsertIncome(userId, IncomeSource.builder()

            .id("demo-seed-income-salary")

            .userId(userId)

            .source("Acme Corp — Salary")

            .amount(new BigDecimal("85000"))

            .lastReceivedDate(today.withDayOfMonth(Math.min(28, today.getDayOfMonth())))

            .nextPaymentDate(today.plusMonths(1).withDayOfMonth(1))

            .frequency("Monthly")

            .color("#10b981")

            .currency("INR")

            .deleted(false)

            .build());

        upsertIncome(userId, IncomeSource.builder()

            .id("demo-seed-income-freelance")

            .userId(userId)

            .source("Design Freelance")

            .amount(new BigDecimal("12000"))

            .lastReceivedDate(today.minusDays(5))

            .nextPaymentDate(today.plusDays(25))

            .frequency("Monthly")

            .color("#3b82f6")

            .currency("INR")

            .deleted(false)

            .build());

        upsertIncome(userId, IncomeSource.builder()

            .id("demo-seed-income-eu-client")

            .userId(userId)

            .source("EU Consulting Client")

            .amount(new BigDecimal("1200"))

            .lastReceivedDate(today.minusDays(20))

            .nextPaymentDate(today.plusDays(10))

            .frequency("Monthly")

            .color("#f59e0b")

            .currency("EUR")

            .deleted(false)

            .build());

    }



    private void upsertIncome(String userId, IncomeSource income) {

        if (incomeSourceRepository.findById(income.getId()).filter(i -> userId.equals(i.getUserId())).isPresent()) {

            return;

        }

        incomeSourceRepository.save(income);

    }



    private void seedInvestments(String userId) {

        upsertInvestment(userId, Investment.builder()

            .id("demo-seed-inv-reliance")

            .userId(userId)

            .symbol("RELIANCE.NS")

            .name("Reliance Industries")

            .type("Stock")

            .quantity(new BigDecimal("15"))

            .averagePrice(new BigDecimal("2450.00"))

            .currency("INR")

            .deleted(false)

            .build(), new BigDecimal("2680.00"));

        upsertInvestment(userId, Investment.builder()

            .id("demo-seed-inv-voo")

            .userId(userId)

            .symbol("VOO")

            .name("Vanguard S&P 500 ETF")

            .type("ETF")

            .quantity(new BigDecimal("8"))

            .averagePrice(new BigDecimal("420.00"))

            .currency("EUR")

            .deleted(false)

            .build(), new BigDecimal("445.50"));

        upsertInvestment(userId, Investment.builder()

            .id("demo-seed-inv-btc")

            .userId(userId)

            .symbol("BTC")

            .name("Bitcoin")

            .type("Crypto")

            .quantity(new BigDecimal("0.05"))

            .averagePrice(new BigDecimal("52000.00"))

            .currency("EUR")

            .deleted(false)

            .build(), new BigDecimal("61000.00"));

    }



    private void upsertInvestment(String userId, Investment inv, BigDecimal currentPrice) {

        if (investmentRepository.findById(inv.getId()).filter(i -> userId.equals(i.getUserId())).isPresent()) {

            return;

        }

        inv.setCurrentPriceInternal(currentPrice);

        investmentRepository.save(inv);

    }



    private void syncDemoBudgetSpent(String userId) {
        List<Budget> budgets = budgetRepository.findAllByUserIdAndDeletedFalse(userId);
        List<Transaction> txs = transactionRepository.findAllByUserIdOrderByTransactionDateDesc(userId);
        for (Budget budget : budgets) {
            if (budget.getId() == null || !budget.getId().startsWith("demo-seed-budget-")) {
                continue;
            }
            BigDecimal spent = BigDecimal.ZERO;
            for (Transaction tx : txs) {
                if (!"expense".equalsIgnoreCase(tx.getType())) {
                    continue;
                }
                if (tx.getCategory() == null || tx.getCurrency() == null || tx.getAmount() == null) {
                    continue;
                }
                if (!tx.getCategory().equalsIgnoreCase(budget.getCategory())) {
                    continue;
                }
                if (!tx.getCurrency().equalsIgnoreCase(budget.getCurrency())) {
                    continue;
                }
                LocalDate txDate = tx.getTransactionDate();
                if (txDate != null && budget.getPeriodStart() != null && budget.getPeriodEnd() != null) {
                    if (txDate.isBefore(budget.getPeriodStart()) || txDate.isAfter(budget.getPeriodEnd())) {
                        continue;
                    }
                }
                spent = spent.add(tx.getAmount().abs());
            }
            budget.resetSpent();
            if (spent.signum() > 0) {
                budget.applySpentDelta(spent);
            }
            budgetRepository.save(budget);
        }
    }

    private record BudgetSeed(String id, String category, String emoji, String color, BigDecimal limit, String currency) {}



    private record SampleRow(

        String idempotencyKey,

        String merchant,

        String type,

        String category,

        BigDecimal amount,

        String currency,

        String accountId,

        int daysAgo

    ) {}

}


