package com.financetracker.controller;

import com.financetracker.dto.BulkDeleteRequest;
import com.financetracker.dto.BulkUpdateRequest;
import com.financetracker.model.Transaction;
import com.financetracker.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance/transactions")
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionService service;

    @GetMapping
    public List<Transaction> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null) {
            return service.findAllByUserId(userId);
        }
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<Transaction> create(@RequestBody Transaction tx, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null && tx.getUserId() == null) {
            tx.setUserId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(tx));
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @SuppressWarnings("null")
    @PatchMapping("/bulk")
    public Map<String, Object> bulkUpdate(@RequestBody BulkUpdateRequest request) {
        int count = service.bulkUpdate(request.getIds(), request.getUpdates());
        return Map.of("success", true, "updatedCount", count);
    }

    @SuppressWarnings("null")
    @PostMapping("/bulk-delete")
    public Map<String, Object> bulkDelete(@RequestBody BulkDeleteRequest request) {
        int count = service.bulkDelete(request.getIds());
        return Map.of("success", true, "deletedCount", count);
    }
}
