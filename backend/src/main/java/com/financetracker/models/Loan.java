package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "loans", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String name;

    @NotNull
    private Double totalAmount;

    @NotNull
    private Double remainingAmount;

    @NotNull
    private Double monthlyEMI;

    @NotNull
    private Double interestRate;

    @NotNull
    private Double tenureYears;

    @NotNull
    private String startDate;

    @NotNull
    private String endDate;

    @NotNull
    private String category;

    @NotNull
    private String color;

    private String currency;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "loan_id")
    private List<LoanPayment> payments;
}

@Entity
@Table(name = "loan_payments", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class LoanPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private LocalDate date;
    private Double amount;
    private Double principal;
    private Double interest;
}
