package com.financetracker.service;

import com.financetracker.model.AuditLog;
import com.financetracker.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogRepository repo;

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public List<AuditLog> findAll() {
        return repo.findAllByOrderByTimestampDesc();
    }

    @Transactional
    public AuditLog create(AuditLog log) {
        if (log.getId() == null || log.getId().isBlank()) {
            log.setId("log-" + System.currentTimeMillis());
        }
        if (log.getTimestamp() == null) {
            log.setTimestamp(java.time.Instant.now().toString());
        }
        return repo.save(log);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
