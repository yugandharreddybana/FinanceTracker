package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "bank_accounts")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BankAccount {
    @Id
    private String id;

    private String name;
    private String type;

    @Column(precision = 15, scale = 2)
    private BigDecimal balance;

    private String bank;
    private String color;
    private String lastSynced;

    @Column(length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(precision = 15, scale = 2)
    private BigDecimal creditLimit;

    private String dueDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal apr;

    @Column(precision = 15, scale = 2)
    private BigDecimal minPayment;

    private String cardNetwork;
    private String cardNumberLast4;
}
