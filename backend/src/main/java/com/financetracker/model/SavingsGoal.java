package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Entity
@Table(name = "savings_goals", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SavingsGoal {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @NotBlank(message = "Savings goal name is required")
    private String name;

    @NotNull(message = "Target amount is required")
    @DecimalMin(value = "0.01", message = "Target must be greater than zero")
    @Column(precision = 15, scale = 2)
    private BigDecimal target;

    // ISSUE #1 FIX: current is server-computed only — never accepted from client input.
    // Updated exclusively by TransactionService.applySavingsDelta() and recalculate().
    @Column(name = "current_amount", precision = 15, scale = 2)
    private BigDecimal current;

    private String emoji;
    private String deadline;
    private Boolean isHero;

    @Column(length = 10)
    private String currency;

    // ISSUE #22 FIX: Soft-delete fields
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    // Package-private setter — only SavingsGoalService/TransactionService may call this
    void setCurrentInternal(BigDecimal current) {
        this.current = current;
    }
}
