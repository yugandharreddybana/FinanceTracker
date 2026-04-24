package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.List;

@Data
@Entity
@Table(name = "loans", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Loan {
    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String name;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal remainingAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal monthlyEMI;

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate;

    private Integer tenureYears;
    private String startDate;
    private String endDate;
    private String category;
    private String color;

    @Column(length = 10)
    private String currency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<LoanPayment> payments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoanPayment {
        private String date;
        private Double amount;
        private Double principal;
        private Double interest;
    }
}
