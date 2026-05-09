package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

@Data
@Entity
@Table(name = "user_profiles", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfile {
    @Id
    private String id;

    private String name;
    private String email;
    private String role;

    @Column(columnDefinition = "text")
    private String avatar;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> preferences;

    private String familyId;

    // Phase5.0009: IANA timezone (e.g. "Pacific/Honolulu", "Asia/Kolkata"). Used
    // by BudgetRolloverScheduler to roll budgets at the user's local first-of-month
    // rather than UTC, so users in UTC-12 don't see a fresh budget on the last
    // day of their local month. Falls back to UTC when null.
    @Column(length = 64)
    private String timezone;
}
