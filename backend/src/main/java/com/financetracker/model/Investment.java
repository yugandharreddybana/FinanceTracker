package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Entity
@Table(name = "investments", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Investment {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @NotBlank(message = "Symbol is required")
    private String symbol;

    private String name;
    private String type;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.00000001", message = "Quantity must be positive")
    @Column(precision = 15, scale = 8)
    private BigDecimal quantity;

    @NotNull(message = "Average price is required")
    @DecimalMin(value = "0.00", inclusive = false, message = "Average price must be positive")
    @Column(precision = 15, scale = 2)
    private BigDecimal averagePrice;

    // ISSUE #4 FIX: currentPrice is NOT accepted from client PUT body.
    // It is updated exclusively by InvestmentPriceRefreshScheduler.
    @Column(precision = 15, scale = 2)
    private BigDecimal currentPrice;

    @Column(length = 10)
    private String currency;

    // Typed as Instant for timezone-safe staleness detection
    @Column(name = "last_updated")
    private Instant lastUpdated;

    // Computed gain/loss — populated on read, never stored
    @Transient
    @JsonProperty("gainLoss")
    public BigDecimal getGainLoss() {
        if (currentPrice == null || averagePrice == null || quantity == null) return null;
        return currentPrice.subtract(averagePrice).multiply(quantity);
    }

    // ISSUE #22 FIX: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
