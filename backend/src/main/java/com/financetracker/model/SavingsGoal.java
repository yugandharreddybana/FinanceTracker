package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

// Phase5.0002: see Budget for rationale — @Data is replaced with @Getter/@Setter
// so 'current' can be marked READ_ONLY for Jackson and given a package-private
// setter. Only TransactionService/SavingsGoalService write the field.
@Getter
@Setter
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

    // ISSUE #1 + Phase5.0002 FIX: current is server-computed only — never accepted
    // from client input. Jackson cannot deserialize this field; only the
    // package-private setter below (or Lombok's setCurrent generated below) can write it.
    @Column(name = "current_amount", precision = 15, scale = 2)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Setter(AccessLevel.PACKAGE)
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

    // Server-only mutator — name signals the only legitimate writers. Jackson is
    // blocked by READ_ONLY on the field, and Lombok's setCurrent is package-private.
    public void setCurrentInternal(BigDecimal current) {
        this.current = current;
    }
}
