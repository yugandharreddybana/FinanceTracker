package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "budgets", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Budget {
    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String category;
    private String emoji;

    @Column(name = "budget_limit", precision = 15, scale = 2)
    @JsonProperty("limit")
    private BigDecimal limit;

    @Column(precision = 15, scale = 2)
    private BigDecimal spent;

    private String color;
    private Boolean rolloverEnabled;

    @Column(precision = 15, scale = 2)
    private BigDecimal rolloverAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal perTransactionLimit;

    private String dueDate;

    @Column(length = 10)
    private String currency;
}
