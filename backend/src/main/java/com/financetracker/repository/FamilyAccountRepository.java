package com.financetracker.repository;

import com.financetracker.model.FamilyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FamilyAccountRepository extends JpaRepository<FamilyAccount, String> {
    List<FamilyAccount> findAllByOwnerIdAndDeletedFalse(String ownerId);

    // ISSUE #11 FIX: Returns families where user is owner OR appears as a member in the JSON array
    @Query(value = "SELECT * FROM finance_app.family_accounts " +
        "WHERE deleted = false AND (owner_id = :uid OR members @> CAST('[{\"uid\": \"' || :uid || '\"}]' AS jsonb))",
        nativeQuery = true)
    List<FamilyAccount> findAllByOwnerOrMember(@Param("uid") String uid);

    @Query("SELECT f FROM FamilyAccount f WHERE f.id = :id AND f.deleted = false")
    java.util.Optional<FamilyAccount> findActiveById(@Param("id") String id);

    @Modifying
    @Transactional
    void deleteByOwnerId(String ownerId);
}
