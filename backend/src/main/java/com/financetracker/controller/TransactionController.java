package com.financetracker.controller;

import com.financetracker.dto.BulkDeleteRequest;
import com.financetracker.dto.BulkUpdateRequest;
import com.financetracker.model.Transaction;
import com.financetracker.service.TransactionService;
import com.financetracker.util.Guards;
import jakarta.validation.Valid;
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
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<Transaction> create(@RequestBody Transaction tx, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        tx.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(tx));
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable String id, @RequestBody Map<String, Object> updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @SuppressWarnings("null")
    @PatchMapping("/bulk")
    public Map<String, Object> bulkUpdate(@Valid @RequestBody BulkUpdateRequest request, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        int count = service.bulkUpdate(request.getIds(), request.getUpdates(), userId);
        return Map.of("success", true, "updatedCount", count);
    }

    @SuppressWarnings("null")
    @PostMapping("/bulk-delete")
    public Map<String, Object> bulkDelete(@Valid @RequestBody BulkDeleteRequest request, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        int count = service.bulkDelete(request.getIds(), userId);
        return Map.of("success", true, "deletedCount", count);
    }
}
