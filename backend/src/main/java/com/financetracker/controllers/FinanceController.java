package com.financetracker.controllers;

import com.financetracker.models.*;
import com.financetracker.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
@CrossOrigin(origins = "*") // Allow frontend to connect
public class FinanceController {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BankAccountRepository bankAccountRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private SavingsGoalRepository savingsGoalRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private RecurringPaymentRepository recurringPaymentRepository;
    @Autowired private IncomeSourceRepository incomeSourceRepository;

    // Transactions
    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return transactionRepository.findAll();
    }

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction addTransaction(@RequestBody Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    @PutMapping("/transactions/{id}")
    public Transaction updateTransaction(@PathVariable String id, @RequestBody Transaction updates) {
        return transactionRepository.findById(id)
                .map(t -> {
                    // Manual merge for simplicity or use a mapper
                    if (updates.getMerchant() != null) t.setMerchant(updates.getMerchant());
                    if (updates.getAmount() != null) t.setAmount(updates.getAmount());
                    if (updates.getCategory() != null) t.setCategory(updates.getCategory());
                    if (updates.getStatus() != null) t.setStatus(updates.getStatus());
                    return transactionRepository.save(t);
                }).orElseThrow();
    }

    // Transactions - Bulk Update
    @PatchMapping("/transactions/bulk")
    public void bulkUpdateTransactions(@RequestBody BulkUpdateRequest request) {
        List<Transaction> transactions = transactionRepository.findAllById(request.getIds());
        for (Transaction t : transactions) {
            if (request.getUpdates().getCategory() != null) t.setCategory(request.getUpdates().getCategory());
            if (request.getUpdates().getStatus() != null) t.setStatus(request.getUpdates().getStatus());
            // Add other fields as needed
        }
        transactionRepository.saveAll(transactions);
    }

    public static class BulkUpdateRequest {
        private List<String> ids;
        private Transaction updates;
        public List<String> getIds() { return ids; }
        public void setIds(List<String> ids) { this.ids = ids; }
        public Transaction getUpdates() { return updates; }
        public void setUpdates(Transaction updates) { this.updates = updates; }
    }

    @DeleteMapping("/transactions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(@PathVariable String id) {
        transactionRepository.deleteById(id);
    }

    // Accounts
    @GetMapping("/accounts")
    public List<BankAccount> getAccounts() {
        return bankAccountRepository.findAll();
    }

    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public BankAccount addAccount(@RequestBody BankAccount account) {
        return bankAccountRepository.save(account);
    }

    @PutMapping("/accounts/{id}")
    public BankAccount updateAccount(@PathVariable String id, @RequestBody BankAccount updates) {
        return bankAccountRepository.findById(id).map(a -> {
            if (updates.getName() != null) a.setName(updates.getName());
            if (updates.getBalance() != null) a.setBalance(updates.getBalance());
            if (updates.getType() != null) a.setType(updates.getType());
            return bankAccountRepository.save(a);
        }).orElseThrow();
    }

    @DeleteMapping("/accounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@PathVariable String id) {
        bankAccountRepository.deleteById(id);
    }

    // Budgets
    @GetMapping("/budgets")
    public List<Budget> getBudgets() {
        return budgetRepository.findAll();
    }

    @PostMapping("/budgets")
    @ResponseStatus(HttpStatus.CREATED)
    public Budget addBudget(@RequestBody Budget budget) {
        return budgetRepository.save(budget);
    }

    @PutMapping("/budgets/{id}")
    public Budget updateBudget(@PathVariable String id, @RequestBody Budget updates) {
        return budgetRepository.findById(id).map(b -> {
            if (updates.getLimitAmount() != null) b.setLimitAmount(updates.getLimitAmount());
            if (updates.getSpent() != null) b.setSpent(updates.getSpent());
            if (updates.getCategory() != null) b.setCategory(updates.getCategory());
            return budgetRepository.save(b);
        }).orElseThrow();
    }

    @DeleteMapping("/budgets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(@PathVariable String id) {
        budgetRepository.deleteById(id);
    }

    // Savings Goals
    @GetMapping("/savings-goals")
    public List<SavingsGoal> getSavingsGoals() {
        return savingsGoalRepository.findAll();
    }

    @PostMapping("/savings-goals")
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsGoal addSavingsGoal(@RequestBody SavingsGoal goal) {
        return savingsGoalRepository.save(goal);
    }

    @PutMapping("/savings-goals/{id}")
    public SavingsGoal updateSavingsGoal(@PathVariable String id, @RequestBody SavingsGoal updates) {
        return savingsGoalRepository.findById(id).map(g -> {
            if (updates.getName() != null) g.setName(updates.getName());
            if (updates.getTarget() != null) g.setTarget(updates.getTarget());
            if (updates.getCurrent() != null) g.setCurrent(updates.getCurrent());
            return savingsGoalRepository.save(g);
        }).orElseThrow();
    }

    @DeleteMapping("/savings-goals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSavingsGoal(@PathVariable String id) {
        savingsGoalRepository.deleteById(id);
    }

    // Loans
    @GetMapping("/loans")
    public List<Loan> getLoans() {
        return loanRepository.findAll();
    }

    @PostMapping("/loans")
    @ResponseStatus(HttpStatus.CREATED)
    public Loan addLoan(@RequestBody Loan loan) {
        return loanRepository.save(loan);
    }

    @PutMapping("/loans/{id}")
    public Loan updateLoan(@PathVariable String id, @RequestBody Loan updates) {
        return loanRepository.findById(id).map(l -> {
            if (updates.getName() != null) l.setName(updates.getName());
            if (updates.getRemainingAmount() != null) l.setRemainingAmount(updates.getRemainingAmount());
            return loanRepository.save(l);
        }).orElseThrow();
    }

    @DeleteMapping("/loans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLoan(@PathVariable String id) {
        loanRepository.deleteById(id);
    }

    // Recurring Payments
    @GetMapping("/recurring-payments")
    public List<RecurringPayment> getRecurringPayments() {
        return recurringPaymentRepository.findAll();
    }

    @PostMapping("/recurring-payments")
    @ResponseStatus(HttpStatus.CREATED)
    public RecurringPayment addRecurringPayment(@RequestBody RecurringPayment payment) {
        return recurringPaymentRepository.save(payment);
    }

    @PutMapping("/recurring-payments/{id}")
    public RecurringPayment updateRecurringPayment(@PathVariable String id, @RequestBody RecurringPayment updates) {
        return recurringPaymentRepository.findById(id).map(p -> {
            if (updates.getName() != null) p.setName(updates.getName());
            if (updates.getAmount() != null) p.setAmount(updates.getAmount());
            if (updates.getStatus() != null) p.setStatus(updates.getStatus());
            return recurringPaymentRepository.save(p);
        }).orElseThrow();
    }

    @DeleteMapping("/recurring-payments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecurringPayment(@PathVariable String id) {
        recurringPaymentRepository.deleteById(id);
    }

    // Income Sources
    @GetMapping("/income-sources")
    public List<IncomeSource> getIncomeSources() {
        return incomeSourceRepository.findAll();
    }

    @PostMapping("/income-sources")
    @ResponseStatus(HttpStatus.CREATED)
    public IncomeSource addIncomeSource(@RequestBody IncomeSource income) {
        return incomeSourceRepository.save(income);
    }

    @PutMapping("/income-sources/{id}")
    public IncomeSource updateIncomeSource(@PathVariable String id, @RequestBody IncomeSource updates) {
        return incomeSourceRepository.findById(id).map(i -> {
            if (updates.getSource() != null) i.setSource(updates.getSource());
            if (updates.getAmount() != null) i.setAmount(updates.getAmount());
            return incomeSourceRepository.save(i);
        }).orElseThrow();
    }

    @DeleteMapping("/income-sources/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIncomeSource(@PathVariable String id) {
        incomeSourceRepository.deleteById(id);
    }
}
