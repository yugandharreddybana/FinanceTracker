package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * ISSUE #10 FIX: Invitation/consent model for family member additions.
 * A family owner sends an invite; the invitee must accept before being added.
 * This prevents any user from being silently added to another user's family group.
 */
@Data
@Entity
@Table(name = "family_invitations", schema = "finance_app")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyInvitation {
    @Id
    private String id;

    @Column(name = "family_id", nullable = false)
    private String familyId;

    @Column(name = "inviter_id", nullable = false)
    private String inviterId;

    @Column(name = "invitee_email", nullable = false)
    private String inviteeEmail;

    // Token sent to invitee — single-use, expires in 72h
    @Column(name = "token", nullable = false, unique = true)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    public enum InvitationStatus {
        PENDING, ACCEPTED, EXPIRED, REVOKED
    }
}
