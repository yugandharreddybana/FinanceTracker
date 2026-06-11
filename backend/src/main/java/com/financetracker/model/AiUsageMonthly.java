package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Data
@Entity
@Table(name = "ai_usage_monthly", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(AiUsageMonthlyId.class)
public class AiUsageMonthly {
    @Id
    @Column(name = "user_id")
    private String userId;

    @Id
    @Column(name = "year_month", length = 7)
    private String yearMonth;

    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
