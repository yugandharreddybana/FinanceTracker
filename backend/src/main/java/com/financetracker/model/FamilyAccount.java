package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;

@Data
@Entity
@Table(name = "family_accounts", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FamilyAccount {
    @Id
    private String id;

    private String name;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    // ISSUE #10 FIX: members list is never written directly from a client PUT.
    // Members are only added via the invite/accept flow (FamilyInvitation entity).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<FamilyMember> members;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> sharedBudgets;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> sharedAccounts;

    // ISSUE #22 FIX: Soft-delete
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FamilyMember {
        private String uid;
        private String name;
        private String role;
    }
}
