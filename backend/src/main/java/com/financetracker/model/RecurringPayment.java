package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.List;

@Data
@Entity
@Table(name = "recurring_payments")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecurringPayment {
    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String name;

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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentHistory {
        private String date;
        private Double amount;
        private String status;
    }
}
