package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "income_sources", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String source;

    @NotNull
    private Double amount;

    @NotNull
    private String date;

    @NotNull
    private String frequency;

    @NotNull
    private String color;

    private String currency;
}
