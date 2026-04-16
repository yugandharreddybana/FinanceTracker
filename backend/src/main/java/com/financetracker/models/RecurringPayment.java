package com.financetracker.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "recurring_payments", schema = "finance_app")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurringPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotNull
    private String name;

    @NotNull
    private Double amount;

    @NotNull
    private Integer date; // day of month

    @NotNull
    private String category;

    @NotNull
    private String frequency; // 'Monthly' | 'Weekly' | 'Annual'

    @NotNull
    private String status; // 'Active' | 'Paused'

    private String currency;
    
    private String description;
    
    private String paymentMethod;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "recurring_payment_id")
    private List<PaymentHistory> history;
}

