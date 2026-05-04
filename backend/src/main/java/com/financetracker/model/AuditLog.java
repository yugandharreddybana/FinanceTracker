package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Data
@Entity
@Table(name = "audit_logs", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditLog {
    @Id
    private String id;

    // ISSUE #8 FIX: userId is anonymised (set to '[DELETED]') on account deletion,
    // never hard-deleted. The audit record itself is always preserved.
    @Column(name = "user_id")
    private String userId;

    // ISSUE #7/#19 FIX: timestamp stored as Instant for proper UTC ordering
    @Column(nullable = false, updatable = false)
    private Instant timestamp;

    private String userName;
    private String action;

    @Column(columnDefinition = "text")
    private String details;

    private String entityType;
    private String entityId;

    // ISSUE #7 FIX: no delete method exists on this entity.
    // Rows are append-only at service layer and DB layer (V2 migration rules).
}
