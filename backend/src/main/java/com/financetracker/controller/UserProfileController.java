package com.financetracker.controller;

import com.financetracker.model.UserProfile;
import com.financetracker.service.UserProfileService;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/finance/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService service;

    @SuppressWarnings("null")
    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getById(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.assertOwner(id, userId);
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Pre-auth lookup for login flow (gated by middleware in production).
    @SuppressWarnings("null")
    @GetMapping("/by-email/{email}")
    public ResponseEntity<UserProfile> getByEmail(@PathVariable String email) {
        return service.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserProfile> create(
            @RequestBody UserProfile profile,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        profile.setId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(profile));
    }

    @PutMapping("/{id}")
    public UserProfile update(@PathVariable String id, @RequestBody UserProfile updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.assertOwner(id, userId);
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.assertOwner(id, userId);
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/by-email/{email}")
    public ResponseEntity<Void> deleteByEmail(@PathVariable String email, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        service.deleteByEmailOwned(email, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/purge/{userId}")
    public ResponseEntity<Void> purgeUserData(@PathVariable("userId") String targetId, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.assertOwner(targetId, userId);
        service.purgeUserData(targetId);
        return ResponseEntity.noContent().build();
    }
}
