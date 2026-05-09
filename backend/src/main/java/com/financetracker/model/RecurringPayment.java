package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Entity
@Table(name = "recurring_payments", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecurringPayment {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @NotBlank(message = "Payment name is required")
    private String name;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "day_of_month")
    @JsonProperty("date")
    private Integer dayOfMonth;

    private String dueDate;

    private String category;
    private String frequency;
    private String status;

    @Column(length = 10)
    private String currency;

    private String description;
    private String paymentMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<PaymentHistory> history;

    // ISSUE #22 FIX: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentHistory {
        private String date;
        // ISSUE #3 FIX: Double → BigDecimal — prevents IEEE 754 drift in payment history
        private BigDecimal amount;
        private String status;
    }
}
