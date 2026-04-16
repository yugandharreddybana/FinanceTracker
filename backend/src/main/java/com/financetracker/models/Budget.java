package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "budgets", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String category;

    @NotNull
    private String emoji;

    @NotNull
    private Double limitAmount; // renamed from 'limit' to avoid SQL keyword issues

    @NotNull
    private Double spent;

    @NotNull
    private String color;

    private Boolean rolloverEnabled;
    
    private Double rolloverAmount;
    
    private Double perTransactionLimit;
    
    private String dueDate;
    
    private String currency;
}
