package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Entity
@Table(
    name = "transactions",
    schema = "finance_app",
    uniqueConstraints = {
        // FLAW #1 FIX: Idempotency key constraint prevents duplicate transactions
        // on network retry. Client supplies X-Idempotency-Key; proxy generates one if absent.
        @UniqueConstraint(name = "uq_tx_idempotency", columnNames = {"user_id", "idempotency_key"})
    }
)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Transaction {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    // FLAW #1 FIX: Idempotency key — set once at creation, never updated
    @Column(name = "idempotency_key", updatable = false)
    private String idempotencyKey;

    // FLAW #12 FIX: transactionDate stored as LocalDate (maps to DATE column — no TZ ambiguity)
    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    // Keep legacy 'date' String field as a convenience alias populated from transactionDate
    // for backward-compat with existing frontend; not used for period comparisons
    @Transient
    private String date;

    // FLAW #12 FIX: createdAt stored as UTC Instant — immutable audit timestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

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
    private String currency;

    // Convenience getter: returns transactionDate as ISO string for frontend compat
    public String getDate() {
        return transactionDate != null ? transactionDate.toString() : null;
    }

    // Convenience setter: parses ISO date string into LocalDate
    public void setDate(String date) {
        this.date = date;
        if (date != null && !date.isBlank()) {
            try {
                this.transactionDate = LocalDate.parse(date);
            } catch (Exception ignored) {}
        }
    }
}
