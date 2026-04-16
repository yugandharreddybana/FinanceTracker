package com.arta.finance.controller;

import com.arta.finance.model.*;
import com.arta.finance.service.FinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
@CrossOrigin(origins = "*")
public class FinanceController {

    @Autowired
    private FinanceService financeService;

    // Transactions
    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return financeService.getAllTransactions();
    }

    @PostMapping("/transactions")
    public ResponseEntity<Transaction> addTransaction(@RequestBody Transaction tx) {
        return new ResponseEntity<>(financeService.addTransaction(tx), HttpStatus.CREATED);
    }

    @PutMapping("/transactions/{id}")
    public Transaction updateTransaction(@PathVariable String id, @RequestBody Transaction tx) {
        return financeService.updateTransaction(id, tx);
    }

    @DeleteMapping("/transactions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(@PathVariable String id) {
        financeService.deleteTransaction(id);
    }

    // Accounts
    @GetMapping("/accounts")
    public List<BankAccount> getAccounts() {
        return financeService.getAllAccounts();
    }

    @PostMapping("/accounts")
    public ResponseEntity<BankAccount> addAccount(@RequestBody BankAccount acc) {
        return new ResponseEntity<>(financeService.addAccount(acc), HttpStatus.CREATED);
    }

    @PutMapping("/accounts/{id}")
    public BankAccount updateAccount(@PathVariable String id, @RequestBody BankAccount acc) {
        return financeService.updateAccount(id, acc);
    }

    @DeleteMapping("/accounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@PathVariable String id) {
        financeService.deleteAccount(id);
    }

    // Budgets
    @GetMapping("/budgets")
    public List<Budget> getBudgets() {
        return financeService.getAllBudgets();
    }

    @PostMapping("/budgets")
    public ResponseEntity<Budget> addBudget(@RequestBody Budget b) {
        return new ResponseEntity<>(financeService.addBudget(b), HttpStatus.CREATED);
    }

    @PutMapping("/budgets/{id}")
    public Budget updateBudget(@PathVariable String id, @RequestBody Budget b) {
        return financeService.updateBudget(id, b);
    }

    @DeleteMapping("/budgets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(@PathVariable String id) {
        financeService.deleteBudget(id);
    }

    // Loans
    @GetMapping("/loans")
    public List<Loan> getLoans() {
        return financeService.getAllLoans();
    }

    @PostMapping("/loans")
    public ResponseEntity<Loan> addLoan(@RequestBody Loan l) {
        return new ResponseEntity<>(financeService.addLoan(l), HttpStatus.CREATED);
    }

    @PutMapping("/loans/{id}")
    public Loan updateLoan(@PathVariable String id, @RequestBody Loan l) {
        return financeService.updateLoan(id, l);
    }

    @DeleteMapping("/loans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLoan(@PathVariable String id) {
        financeService.deleteLoan(id);
    }

    // Savings Goals
    @GetMapping("/savings-goals")
    public List<SavingsGoal> getSavingsGoals() {
        return financeService.getAllSavingsGoals();
    }

    @PostMapping("/savings-goals")
    public ResponseEntity<SavingsGoal> addSavingsGoal(@RequestBody SavingsGoal g) {
        return new ResponseEntity<>(financeService.addSavingsGoal(g), HttpStatus.CREATED);
    }

    @PutMapping("/savings-goals/{id}")
    public SavingsGoal updateSavingsGoal(@PathVariable String id, @RequestBody SavingsGoal g) {
        return financeService.updateSavingsGoal(id, g);
    }

    @DeleteMapping("/savings-goals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSavingsGoal(@PathVariable String id) {
        financeService.deleteSavingsGoal(id);
    }

    // Recurring Payments
    @GetMapping("/recurring-payments")
    public List<RecurringPayment> getRecurringPayments() {
        return financeService.getAllRecurringPayments();
    }

    @PostMapping("/recurring-payments")
    public ResponseEntity<RecurringPayment> addRecurringPayment(@RequestBody RecurringPayment p) {
        return new ResponseEntity<>(financeService.addRecurringPayment(p), HttpStatus.CREATED);
    }

    @PutMapping("/recurring-payments/{id}")
    public RecurringPayment updateRecurringPayment(@PathVariable String id, @RequestBody RecurringPayment p) {
        return financeService.updateRecurringPayment(id, p);
    }

    @DeleteMapping("/recurring-payments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecurringPayment(@PathVariable String id) {
        financeService.deleteRecurringPayment(id);
    }

    // Income Sources
    @GetMapping("/income-sources")
    public List<IncomeSource> getIncomeSources() {
        return financeService.getAllIncomeSources();
    }

    @PostMapping("/income-sources")
    public ResponseEntity<IncomeSource> addIncomeSource(@RequestBody IncomeSource i) {
        return new ResponseEntity<>(financeService.addIncomeSource(i), HttpStatus.CREATED);
    }

    @PutMapping("/income-sources/{id}")
    public IncomeSource updateIncomeSource(@PathVariable String id, @RequestBody IncomeSource i) {
        return financeService.updateIncomeSource(id, i);
    }

    @DeleteMapping("/income-sources/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIncomeSource(@PathVariable String id) {
        financeService.deleteIncomeSource(id);
    }
}
