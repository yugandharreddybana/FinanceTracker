package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private String idempotencyKey;

    // FLAW #12 FIX: transactionDate stored as LocalDate (maps to DATE column — no TZ ambiguity)
    @JsonProperty("date")
    @Column(name = "transaction_date")
    private LocalDate transactionDate;


    // Phase5.0012: createdAt is set on INSERT via @PrePersist — not at object
    // construction. The previous initializer made the timestamp wrong when an
    // object was built and then queued for retry, persisting minutes later.
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (idempotencyKey == null) {
            idempotencyKey = java.util.UUID.randomUUID().toString();
        }
    }

    private String merchant;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    private String category;
    private String type;
    private String status;
    private String aiTag;
    private String account;

    @Column(precision = 3, scale = 2)
    @jakarta.validation.constraints.DecimalMin("0.00")
    @jakarta.validation.constraints.DecimalMax("1.00")
    private BigDecimal confidence;

    private String savingsGoalId;

    @Column(length = 10)
    private String currency;

}
