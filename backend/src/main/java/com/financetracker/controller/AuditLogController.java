package com.financetracker.controller;

import com.financetracker.model.AuditLog;
import com.financetracker.service.AuditLogService;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {
    private final AuditLogService service;

    @GetMapping
    public List<AuditLog> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<AuditLog> create(@RequestBody AuditLog log, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        log.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(log));
    }

    // Phase4.0005: DELETE removed. Audit logs are append-only; the V2 migration
    // also revokes UPDATE/DELETE at the DB level. For GDPR right-to-erasure use
    // AuditLogService.anonymiseByUserId via account deletion flow.
}
