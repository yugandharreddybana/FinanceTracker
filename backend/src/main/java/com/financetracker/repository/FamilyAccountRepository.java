package com.financetracker.repository;

import com.financetracker.model.FamilyAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyAccountRepository extends JpaRepository<FamilyAccount, String> {
}
