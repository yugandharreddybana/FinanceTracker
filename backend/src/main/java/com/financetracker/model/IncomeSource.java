package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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

    @Column(name = "user_id", nullable = false)
    private String userId;

    @NotBlank(message = "Source name is required")
    private String source;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    // ISSUE #20 FIX: Typed as LocalDate for correct period-based projections
    @Column(name = "last_received_date")
    private LocalDate lastReceivedDate;

    // ISSUE #20 FIX: nextPaymentDate computed from lastReceivedDate + frequency
    @Column(name = "next_payment_date")
    private LocalDate nextPaymentDate;

    private String frequency;
    private String color;

    @Column(length = 10)
    private String currency;

    // ISSUE #22 FIX: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
