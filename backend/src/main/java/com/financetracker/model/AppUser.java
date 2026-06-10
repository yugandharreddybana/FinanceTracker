package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "app_users", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {
    @Id
    private String id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String displayName;

    private String passwordHash;
    private String salt;
    
    @Builder.Default
    private Integer hashIterations = 600000;
    
    @Builder.Default
    private Boolean emailVerified = false;

    @Builder.Default
    private java.time.Instant createdAt = java.time.Instant.now();

    @Builder.Default
    private java.time.Instant passwordChangedAt = java.time.Instant.now();

    @Builder.Default
    private Boolean deleted = false;

    private java.time.Instant deletedAt;
}
