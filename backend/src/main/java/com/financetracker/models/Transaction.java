package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "transactions", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String date;

    @NotNull
    private String merchant;

    @NotNull
    private Double amount;

    @NotNull
    private String category;

    private String type; // 'expense' | 'income'

    private String status; // 'confirmed' | 'pending'

    private String aiTag;
    
    private String account;
    
    private Double confidence;
    
    private String savingsGoalId;
    
    private String currency;
}
