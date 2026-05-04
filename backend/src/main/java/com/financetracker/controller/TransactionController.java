package com.financetracker.controller;

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
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(tx));
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable String id,
            @RequestBody Map<String, Object> updates,
            @RequestHeader("X-User-Id") String userId) {
        return service.update(id, updates, userId);
    }

    @PatchMapping("/bulk")
    public Map<String, Integer> bulkUpdate(@RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String userId) {
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        @SuppressWarnings("unchecked")
        Map<String, Object> updates = (Map<String, Object>) body.get("updates");
        return Map.of("updated", service.bulkUpdate(ids, updates, userId));
    }

    @PostMapping("/bulk-delete")
    public Map<String, Integer> bulkDelete(@RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String userId) {
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        return Map.of("deleted", service.bulkDelete(ids, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ISSUE #13 FIX: User-confirmed recategorisation endpoint.
    // Sets confidence = 1.0 (user-verified) and fires a correction audit event.
    @PostMapping("/{id}/recategorise")
    public ResponseEntity<Transaction> recategorise(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String userId) {
        String newCategory = body.get("category");
        if (newCategory == null || newCategory.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Transaction updated = service.update(id,
            Map.of("category", newCategory, "aiTag", newCategory, "confidence", "1.00"),
            userId);
        return ResponseEntity.ok(updated);
    }
}
