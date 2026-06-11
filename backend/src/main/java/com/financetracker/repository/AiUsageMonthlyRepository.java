package com.financetracker.repository;

import com.financetracker.model.AiUsageMonthly;
import com.financetracker.model.AiUsageMonthlyId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface AiUsageMonthlyRepository extends JpaRepository<AiUsageMonthly, AiUsageMonthlyId> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AiUsageMonthly a WHERE a.userId = :userId AND a.yearMonth = :yearMonth")
    Optional<AiUsageMonthly> findForUpdate(@Param("userId") String userId, @Param("yearMonth") String yearMonth);
}
