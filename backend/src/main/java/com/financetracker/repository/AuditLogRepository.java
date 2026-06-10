package com.financetracker.repository;

import com.financetracker.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId);
    List<AuditLog> findAllByOrderByTimestampDesc();
    List<AuditLog> findAllByUserId(String userId);

    @Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AuditLog a SET a.userId = '[DELETED]', a.userName = '[DELETED]', a.details = '[REDACTED]' WHERE a.userId = :userId")
    void anonymiseByUserId(@org.springframework.data.repository.query.Param("userId") String userId);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
