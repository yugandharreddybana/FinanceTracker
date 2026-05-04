package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "bank_accounts", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BankAccount {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String name;
    private String type;

    @Column(precision = 15, scale = 2)
    private BigDecimal balance;

    // FLAW #6 FIX: @Version enables optimistic locking on balance updates.
    // If two concurrent transactions read the same balance and both try to write,
    // the second write will throw OptimisticLockException and be retried safely.
    @Version
    @Column(nullable = false)
    private Long version;

    private String bank;
    private String color;
    private String lastSynced;

    @Column(length = 10)
    private String currency;

    @Column(precision = 15, scale = 2)
    private BigDecimal creditLimit;

    private String dueDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal apr;

    @Column(precision = 15, scale = 2)
    private BigDecimal minPayment;

    private String cardNetwork;
    private String cardNumberLast4;

    private Boolean isJoint;
    private Boolean isPrimary;
}
