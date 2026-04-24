package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "user_id")
    private String userId;

    private String timestamp;
    private String userName;
    private String action;

    @Column(columnDefinition = "text")
    private String details;

    private String entityType;
    private String entityId;
}
