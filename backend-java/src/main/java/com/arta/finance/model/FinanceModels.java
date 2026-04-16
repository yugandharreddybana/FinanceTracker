package com.arta.finance.model;

import lombok.Data;
import java.util.List;

@Data
public class BankAccount {
    private String id;
    private String name;
    private String bank;
    private double balance;
    private String type; // Current, Savings, Credit, Investment
    private String currency;
    private String color;
    private String lastSynced;
    private Double creditLimit;
    private String dueDate;
    private Double apr;
    private Double minPayment;
    private String cardNetwork;
    private String cardNumberLast4;
}

@Data
public class Transaction {
    private String id;
    private String date;
    private String merchant;
    private double amount;
    private String category;
    private String type; // income, expense
    private String account;
    private String status; // pending, confirmed
    private String aiTag;
    private Double confidence;
    private String savingsGoalId;
    private String currency;
}

@Data
public class Budget {
    private String id;
    private String category;
    private double limit;
    private double spent;
    private String color;
    private String icon;
    private String currency;
}

@Data
public class Loan {
    private String id;
    private String name;
    private double totalAmount;
    private double remainingAmount;
    private double monthlyEMI;
    private double interestRate;
    private double tenureYears;
    private String startDate;
    private String endDate;
    private String category;
    private String color;
    private List<LoanPayment> payments;
    private String currency;
}

@Data
public class LoanPayment {
    private String date;
    private double amount;
    private double principal;
    private double interest;
}

@Data
public class SavingsGoal {
    private String id;
    private String name;
    private double target;
    private double current;
    private String emoji;
    private String deadline;
    private boolean isHero;
    private String currency;
}

@Data
public class RecurringPayment {
    private String id;
    private String name;
    private double amount;
    private int date; // Day of month
    private String category;
    private String frequency;
    private String status; // Active, Paused
    private String paymentMethod;
    private String description;
    private List<PaymentHistory> history;
    private String currency;
}

@Data
public class PaymentHistory {
    private String date;
    private double amount;
    private String status;
}

@Data
public class IncomeSource {
    private String id;
    private String source;
    private double amount;
    private String frequency;
    private String color;
    private String date;
    private String currency;
}
