package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "savings_goals")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SavingsGoal {
    @Id
    private String id;

    private String name;

    @Column(precision = 15, scale = 2)
    private BigDecimal target;

    @Column(name = "current_amount", precision = 15, scale = 2)
    @com.fasterxml.jackson.annotation.JsonProperty("current")
    private BigDecimal current;

    private String emoji;
    private String deadline;
    private Boolean isHero;

    @Column(length = 10)
    @Builder.Default
    private String currency = "INR";
}
