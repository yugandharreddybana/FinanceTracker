package com.financetracker.service;

import com.financetracker.model.AuditLog;
import com.financetracker.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogRepository repo;

    @Transactional(readOnly = true)
    public List<AuditLog> findAllByUserId(String userId) {
        return repo.findAllByUserId(userId);
    }

    @Transactional
    public AuditLog create(AuditLog log) {
        // ISSUE #16 FIX: UUID-based ID
        log.setId("log-" + UUID.randomUUID());
        // Always set timestamp server-side — never trust client-supplied value
        log.setTimestamp(Instant.now());
        return repo.save(log);
    }

    // ISSUE #7 FIX: delete() method REMOVED ENTIRELY.
    // Audit logs are append-only. DB-level rules (V2 migration) also prevent UPDATE/DELETE.
    // For GDPR right-to-erasure, use anonymise() instead.

    @Transactional
    public void anonymiseByUserId(String userId) {
        // ISSUE #8 FIX: Called on account deletion — replaces PII, preserves event records.
        List<AuditLog> logs = repo.findAllByUserId(userId);
        for (AuditLog log : logs) {
            log.setUserId("[DELETED]");
            log.setUserName("[DELETED]");
            log.setDetails("[REDACTED]");
            repo.save(log);
        }
    }
}
