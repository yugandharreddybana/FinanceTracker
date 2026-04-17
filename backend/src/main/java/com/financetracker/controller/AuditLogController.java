package com.financetracker.controller;

import com.financetracker.model.AuditLog;
import com.financetracker.service.AuditLogService;
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
    public List<AuditLog> getAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<AuditLog> create(@RequestBody AuditLog log) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(log));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
