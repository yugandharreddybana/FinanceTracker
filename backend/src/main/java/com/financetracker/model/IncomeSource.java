package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "income_sources")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IncomeSource {
    @Id
    private String id;

    private String source;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    private String date;
    private String frequency;
    private String color;

    @Column(length = 10)
    @Builder.Default
    private String currency = "INR";
}
