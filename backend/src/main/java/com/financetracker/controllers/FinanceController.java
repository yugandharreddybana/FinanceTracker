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
                    if (updates.getDate() != null) t.setDate(updates.getDate());
                    if (updates.getMerchant() != null) t.setMerchant(updates.getMerchant());
                    if (updates.getAmount() != null) t.setAmount(updates.getAmount());
                    if (updates.getCategory() != null) t.setCategory(updates.getCategory());
                    if (updates.getType() != null) t.setType(updates.getType());
                    if (updates.getStatus() != null) t.setStatus(updates.getStatus());
                    if (updates.getAiTag() != null) t.setAiTag(updates.getAiTag());
                    if (updates.getAccount() != null) t.setAccount(updates.getAccount());
                    if (updates.getConfidence() != null) t.setConfidence(updates.getConfidence());
                    if (updates.getSavingsGoalId() != null) t.setSavingsGoalId(updates.getSavingsGoalId());
                    if (updates.getCurrency() != null) t.setCurrency(updates.getCurrency());
                    return transactionRepository.save(t);
                }).orElseThrow();
    }

    // Transactions - Bulk Update
    @PatchMapping("/transactions/bulk")
    public void bulkUpdateTransactions(@RequestBody BulkUpdateRequest request) {
        List<Transaction> transactions = transactionRepository.findAllById(request.getIds());
        for (Transaction t : transactions) {
            if (request.getUpdates().getDate() != null) t.setDate(request.getUpdates().getDate());
            if (request.getUpdates().getMerchant() != null) t.setMerchant(request.getUpdates().getMerchant());
            if (request.getUpdates().getAmount() != null) t.setAmount(request.getUpdates().getAmount());
            if (request.getUpdates().getCategory() != null) t.setCategory(request.getUpdates().getCategory());
            if (request.getUpdates().getType() != null) t.setType(request.getUpdates().getType());
            if (request.getUpdates().getStatus() != null) t.setStatus(request.getUpdates().getStatus());
            if (request.getUpdates().getAiTag() != null) t.setAiTag(request.getUpdates().getAiTag());
            if (request.getUpdates().getAccount() != null) t.setAccount(request.getUpdates().getAccount());
            if (request.getUpdates().getConfidence() != null) t.setConfidence(request.getUpdates().getConfidence());
            if (request.getUpdates().getSavingsGoalId() != null) t.setSavingsGoalId(request.getUpdates().getSavingsGoalId());
            if (request.getUpdates().getCurrency() != null) t.setCurrency(request.getUpdates().getCurrency());
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
            if (updates.getBank() != null) a.setBank(updates.getBank());
            if (updates.getColor() != null) a.setColor(updates.getColor());
            if (updates.getLastSynced() != null) a.setLastSynced(updates.getLastSynced());
            if (updates.getCurrency() != null) a.setCurrency(updates.getCurrency());
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
            if (updates.getEmoji() != null) b.setEmoji(updates.getEmoji());
            if (updates.getColor() != null) b.setColor(updates.getColor());
            if (updates.getRolloverEnabled() != null) b.setRolloverEnabled(updates.getRolloverEnabled());
            if (updates.getRolloverAmount() != null) b.setRolloverAmount(updates.getRolloverAmount());
            if (updates.getPerTransactionLimit() != null) b.setPerTransactionLimit(updates.getPerTransactionLimit());
            if (updates.getDueDate() != null) b.setDueDate(updates.getDueDate());
            if (updates.getCurrency() != null) b.setCurrency(updates.getCurrency());
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
            if (updates.getEmoji() != null) g.setEmoji(updates.getEmoji());
            if (updates.getDeadline() != null) g.setDeadline(updates.getDeadline());
            if (updates.getIsHero() != null) g.setIsHero(updates.getIsHero());
            if (updates.getCurrency() != null) g.setCurrency(updates.getCurrency());
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
            if (updates.getTotalAmount() != null) l.setTotalAmount(updates.getTotalAmount());
            if (updates.getRemainingAmount() != null) l.setRemainingAmount(updates.getRemainingAmount());
            if (updates.getMonthlyEMI() != null) l.setMonthlyEMI(updates.getMonthlyEMI());
            if (updates.getInterestRate() != null) l.setInterestRate(updates.getInterestRate());
            if (updates.getTenureYears() != null) l.setTenureYears(updates.getTenureYears());
            if (updates.getStartDate() != null) l.setStartDate(updates.getStartDate());
            if (updates.getEndDate() != null) l.setEndDate(updates.getEndDate());
            if (updates.getCategory() != null) l.setCategory(updates.getCategory());
            if (updates.getColor() != null) l.setColor(updates.getColor());
            if (updates.getCurrency() != null) l.setCurrency(updates.getCurrency());
            if (updates.getPayments() != null) l.setPayments(updates.getPayments());
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
            if (updates.getDate() != null) p.setDate(updates.getDate());
            if (updates.getCategory() != null) p.setCategory(updates.getCategory());
            if (updates.getFrequency() != null) p.setFrequency(updates.getFrequency());
            if (updates.getStatus() != null) p.setStatus(updates.getStatus());
            if (updates.getCurrency() != null) p.setCurrency(updates.getCurrency());
            if (updates.getDescription() != null) p.setDescription(updates.getDescription());
            if (updates.getPaymentMethod() != null) p.setPaymentMethod(updates.getPaymentMethod());
            if (updates.getHistory() != null) p.setHistory(updates.getHistory());
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
            if (updates.getDate() != null) i.setDate(updates.getDate());
            if (updates.getFrequency() != null) i.setFrequency(updates.getFrequency());
            if (updates.getColor() != null) i.setColor(updates.getColor());
            if (updates.getCurrency() != null) i.setCurrency(updates.getCurrency());
            return incomeSourceRepository.save(i);
        }).orElseThrow();
    }

    @DeleteMapping("/income-sources/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIncomeSource(@PathVariable String id) {
        incomeSourceRepository.deleteById(id);
    }
}
