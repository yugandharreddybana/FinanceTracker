package com.financetracker.service;

import com.financetracker.model.AuditLog;
import com.financetracker.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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

    // Phase5.0011: REQUIRED propagation joins the caller's transaction
    // (UserProfileService.purgeUserData) so a connection drop mid-purge rolls
    // back the entire account deletion atomically, preventing partial states
    // where some PII has been redacted but other data remains.
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public void anonymiseByUserId(String userId) {
        // ISSUE #8 FIX: Called on account deletion — replaces PII, preserves event records.
        // ISSUE 4.041 FIX: Single batch update for better performance.
        repo.anonymiseByUserId(userId);
    }
}
