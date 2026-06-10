package com.financetracker.controller;

import com.financetracker.dto.BulkDeleteRequest;
import com.financetracker.dto.BulkUpdateRequest;
import com.financetracker.model.Transaction;
import com.financetracker.service.TransactionService;
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
    public List<Transaction> getAll(@RequestHeader("X-User-Id") String userId) {
        return service.findAllByUserId(userId);
    }

    // ISSUE #12 FIX: @Valid enforces Bean Validation constraints on incoming request body
    @PostMapping
    public ResponseEntity<Transaction> create(
            @Valid @RequestBody Transaction tx,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
        tx.setUserId(userId);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            tx.setIdempotencyKey(idempotencyKey);
        }
        return ResponseEntity.ok(service.create(tx));
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable String id,
            @RequestBody Map<String, Object> updates,
            @RequestHeader("X-User-Id") String userId) {
        return service.update(id, updates, userId);
    }

    @PatchMapping("/bulk")
    public Map<String, Integer> bulkUpdate(@Valid @RequestBody BulkUpdateRequest request,
            @RequestHeader("X-User-Id") String userId) {
        return Map.of("updated", service.bulkUpdate(request.getIds(), request.getUpdates(), userId));
    }

    @PostMapping("/bulk-delete")
    public Map<String, Integer> bulkDelete(@Valid @RequestBody BulkDeleteRequest request,
            @RequestHeader("X-User-Id") String userId) {
        return Map.of("deleted", service.bulkDelete(request.getIds(), userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ISSUE #13 FIX + Phase4.0008: dedicated recategorisation endpoint. Confidence
    // is set inside the service, never accepted from clients.
    @PostMapping("/{id}/recategorise")
    public ResponseEntity<Transaction> recategorise(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String userId) {
        String newCategory = body.get("category");
        if (newCategory == null || newCategory.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(service.recategorise(id, newCategory, userId));
    }
}
