package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "income_sources", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IncomeSource {
    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String source;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    private String date;
    private String frequency;
    private String color;

    @Column(length = 10)
    private String currency;
}
