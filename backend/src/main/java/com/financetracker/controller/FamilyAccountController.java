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
    public List<FamilyAccount> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.findAllForUser(userId);
    }

    @SuppressWarnings("null")
    @GetMapping("/{id}")
    public ResponseEntity<FamilyAccount> getById(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.findByIdForUser(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<FamilyAccount> create(@RequestBody FamilyAccount family, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        // Phase4.0009: ownerId is forced from the verified JWT, members[] and id
        // are dropped so a client can't self-grant ADMIN or pin a known id —
        // FamilyAccountService.create() (re)initialises both server-side.
        family.setOwnerId(userId);
        family.setMembers(null);
        family.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(family));
    }

    @PutMapping("/{id}")
    public FamilyAccount update(@PathVariable String id, @RequestBody FamilyAccount updates, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
