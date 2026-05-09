package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bank_accounts", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String name;

    @NotNull
    private String type; // 'Current' | 'Savings' | 'Credit'

    @NotNull
    private Double balance;

    @NotNull
    private String bank;

    @NotNull
    private String color;

    @NotNull
    private String lastSynced;

    private String currency;
}
