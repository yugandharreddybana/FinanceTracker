package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "transactions")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Transaction {
    @Id
    private String id;

    private String date;
    private String merchant;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    private String category;
    private String type;
    private String status;
    private String aiTag;
    private String account;

    @Column(precision = 5, scale = 2)
    private BigDecimal confidence;

    private String savingsGoalId;

    @Column(length = 10)
    @Builder.Default
    private String currency = "INR";
}
