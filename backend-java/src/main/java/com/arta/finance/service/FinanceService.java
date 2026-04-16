package com.arta.finance.service;

import com.arta.finance.model.*;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class FinanceService {
    private final Map<String, Transaction> transactions = new ConcurrentHashMap<>();
    private final Map<String, BankAccount> accounts = new ConcurrentHashMap<>();
    private final Map<String, Budget> budgets = new ConcurrentHashMap<>();
    private final Map<String, Loan> loans = new ConcurrentHashMap<>();
    private final Map<String, SavingsGoal> savingsGoals = new ConcurrentHashMap<>();
    private final Map<String, RecurringPayment> recurringPayments = new ConcurrentHashMap<>();
    private final Map<String, IncomeSource> incomeSources = new ConcurrentHashMap<>();

    // Transactions
    public List<Transaction> getAllTransactions() { return new ArrayList<>(transactions.values()); }
    public Transaction addTransaction(Transaction tx) {
        if (tx.getId() == null) tx.setId("tx-" + System.currentTimeMillis());
        transactions.put(tx.getId(), tx);
        return tx;
    }
    public Transaction updateTransaction(String id, Transaction tx) {
        tx.setId(id);
        transactions.put(id, tx);
        return tx;
    }
    public void deleteTransaction(String id) { transactions.remove(id); }

    // Accounts
    public List<BankAccount> getAllAccounts() { return new ArrayList<>(accounts.values()); }
    public BankAccount addAccount(BankAccount acc) {
        if (acc.getId() == null) acc.setId("acc-" + System.currentTimeMillis());
        accounts.put(acc.getId(), acc);
        return acc;
    }
    public BankAccount updateAccount(String id, BankAccount acc) {
        acc.setId(id);
        accounts.put(id, acc);
        return acc;
    }
    public void deleteAccount(String id) { accounts.remove(id); }

    // Budgets
    public List<Budget> getAllBudgets() { return new ArrayList<>(budgets.values()); }
    public Budget addBudget(Budget b) {
        if (b.getId() == null) b.setId("budget-" + System.currentTimeMillis());
        budgets.put(b.getId(), b);
        return b;
    }
    public Budget updateBudget(String id, Budget b) {
        b.setId(id);
        budgets.put(id, b);
        return b;
    }
    public void deleteBudget(String id) { budgets.remove(id); }

    // Loans
    public List<Loan> getAllLoans() { return new ArrayList<>(loans.values()); }
    public Loan addLoan(Loan l) {
        if (l.getId() == null) l.setId("loan-" + System.currentTimeMillis());
        loans.put(l.getId(), l);
        return l;
    }
    public Loan updateLoan(String id, Loan l) {
        l.setId(id);
        loans.put(id, l);
        return l;
    }
    public void deleteLoan(String id) { loans.remove(id); }

    // Savings Goals
    public List<SavingsGoal> getAllSavingsGoals() { return new ArrayList<>(savingsGoals.values()); }
    public SavingsGoal addSavingsGoal(SavingsGoal g) {
        if (g.getId() == null) g.setId("goal-" + System.currentTimeMillis());
        savingsGoals.put(g.getId(), g);
        return g;
    }
    public SavingsGoal updateSavingsGoal(String id, SavingsGoal g) {
        g.setId(id);
        savingsGoals.put(id, g);
        return g;
    }
    public void deleteSavingsGoal(String id) { savingsGoals.remove(id); }

    // Recurring Payments
    public List<RecurringPayment> getAllRecurringPayments() { return new ArrayList<>(recurringPayments.values()); }
    public RecurringPayment addRecurringPayment(RecurringPayment p) {
        if (p.getId() == null) p.setId("rec-" + System.currentTimeMillis());
        recurringPayments.put(p.getId(), p);
        return p;
    }
    public RecurringPayment updateRecurringPayment(String id, RecurringPayment p) {
        p.setId(id);
        recurringPayments.put(id, p);
        return p;
    }
    public void deleteRecurringPayment(String id) { recurringPayments.remove(id); }

    // Income Sources
    public List<IncomeSource> getAllIncomeSources() { return new ArrayList<>(incomeSources.values()); }
    public IncomeSource addIncomeSource(IncomeSource i) {
        if (i.getId() == null) i.setId("income-" + System.currentTimeMillis());
        incomeSources.put(i.getId(), i);
        return i;
    }
    public IncomeSource updateIncomeSource(String id, IncomeSource i) {
        i.setId(id);
        incomeSources.put(id, i);
        return i;
    }
    public void deleteIncomeSource(String id) { incomeSources.remove(id); }
}
