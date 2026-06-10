package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

// Phase5.0014: drop @Data so currentPrice can be marked READ_ONLY for Jackson
// AND have a package-private setter — same pattern as Budget.spent. Only
// InvestmentService.updatePricesFromMarket (called by the scheduler) can write.
@Getter
@Setter
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

    // ISSUE #4 + Phase5.0014 FIX: currentPrice is NOT accepted from client PUT
    // body. Jackson cannot deserialize (READ_ONLY) and Lombok's setCurrentPrice
    // is package-private; the scheduler uses setCurrentPriceInternal below.
    @Column(precision = 15, scale = 2)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Setter(AccessLevel.PACKAGE)
    private BigDecimal currentPrice;

    @Column(length = 10)
    private String currency;

    // Typed as Instant for timezone-safe staleness detection
    @Column(name = "last_updated")
    private Instant lastUpdated;

    // Computed gain/loss — populated on read, never stored
    // Note (Phase4.025): Both averagePrice and currentPrice MUST be denominated 
    // in the same currency (Investment.currency). Gain/loss calculations assume 
    // consistency; mismatches must be guarded upstream.
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

    // Phase5.0014: server-only mutator named to signal scheduler-only write path.
    // Jackson is blocked by READ_ONLY; cross-package callers must use this method.
    public void setCurrentPriceInternal(BigDecimal price) {
        this.currentPrice = price;
        this.lastUpdated = Instant.now();
    }
}
