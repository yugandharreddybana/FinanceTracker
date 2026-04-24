package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

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

    @Column(name = "user_id")
    private String userId;

    private String name;

    @Column(precision = 15, scale = 2)
    private BigDecimal target;

    @Column(name = "current_amount", precision = 15, scale = 2)
    private BigDecimal current;

    private String emoji;
    private String deadline;
    private Boolean isHero;

    @Column(length = 10)
    private String currency;
}
