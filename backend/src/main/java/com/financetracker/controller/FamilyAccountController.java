package com.financetracker.controller;

import com.financetracker.model.FamilyAccount;
import com.financetracker.service.FamilyAccountService;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/family")
@RequiredArgsConstructor
public class FamilyAccountController {
    private final FamilyAccountService service;

    @GetMapping
    public List<FamilyAccount> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findAllForUser(userId);
    }

    @SuppressWarnings("null")
    @GetMapping("/{id}")
    public ResponseEntity<FamilyAccount> getById(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findByIdForUser(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<FamilyAccount> create(@RequestBody FamilyAccount family, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        family.setOwnerId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(family));
    }

    @PutMapping("/{id}")
    public FamilyAccount update(@PathVariable String id, @RequestBody FamilyAccount updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
