package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "investments")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Investment {
    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String symbol;
    private String name;
    private String type;

    @Column(precision = 15, scale = 8)
    private BigDecimal quantity;

    @Column(precision = 15, scale = 2)
    private BigDecimal averagePrice;

    @Column(precision = 15, scale = 2)
    private BigDecimal currentPrice;

    @Column(length = 10)
    private String currency;

    private String lastUpdated;
}
