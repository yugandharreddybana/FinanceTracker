package com.financetracker.repository;

import com.financetracker.model.FamilyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface FamilyAccountRepository extends JpaRepository<FamilyAccount, String> {
    java.util.List<FamilyAccount> findAllByOwnerId(String ownerId);

    @Modifying
    @Transactional
    void deleteByOwnerId(String ownerId);
}
