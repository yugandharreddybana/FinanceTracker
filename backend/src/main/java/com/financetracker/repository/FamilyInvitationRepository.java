package com.financetracker.repository;

import com.financetracker.model.FamilyInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * ISSUE #10 FIX: Repository for family invitation tokens.
 */
public interface FamilyInvitationRepository extends JpaRepository<FamilyInvitation, String> {
    Optional<FamilyInvitation> findByToken(String token);
}
