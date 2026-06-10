package com.financetracker.controller;

import com.financetracker.model.FamilyAccount;
import com.financetracker.service.FamilyAccountService;
import com.financetracker.util.Guards;
import lombok.Data;
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
        return ResponseEntity.ok(service.create(family));
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

    @PostMapping("/{id}/members")
    public ResponseEntity<FamilyAccount> addMember(
            @PathVariable String id,
            @RequestBody AddMemberRequest request,
            @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        FamilyAccount updated = service.addMember(id, userId, request.getName(), request.getRole());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/members/{uid}")
    public ResponseEntity<FamilyAccount> removeMember(
            @PathVariable String id,
            @PathVariable String uid,
            @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        FamilyAccount updated = service.removeMember(id, userId, uid);
        return ResponseEntity.ok(updated);
    }

    @Data
    public static class AddMemberRequest {
        private String name;
        private String role;
    }
}
