package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

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

    @NotBlank(message = "Account name is required")
    private String name;

    private String type;

    @Column(precision = 15, scale = 2)
    private BigDecimal balance;

    // ISSUE #6 FIX (from prev commit): Optimistic locking version
    @Version
    @Column(nullable = false)
    private Long version;

    private String bank;
    private String color;

    // ISSUE #21 FIX: lastSynced typed as Instant for timezone-safe staleness detection
    @Column(name = "last_synced")
    private Instant lastSynced;

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

    // ISSUE #21 FIX: computed sync status — stale if not synced within 24h
    @Transient
    public String getSyncStatus() {
        if (lastSynced == null) return "NEVER_SYNCED";
        return lastSynced.isBefore(Instant.now().minusSeconds(86400)) ? "STALE" : "FRESH";
    }

    // ISSUE #22 FIX: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
