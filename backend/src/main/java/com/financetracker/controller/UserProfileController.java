package com.financetracker.controller;

import com.financetracker.model.UserProfile;
import com.financetracker.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {
    private final UserProfileService service;

    @GetMapping
    public List<UserProfile> getAll() {
        return service.findAll();
    }

    @SuppressWarnings("null")
    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getById(@PathVariable String id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

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
        if ((profile.getId() == null || profile.getId().isBlank()) && userId != null) {
            profile.setId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(profile));
    }

    @PutMapping("/{id}")
    public UserProfile update(@PathVariable String id, @RequestBody UserProfile updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/by-email/{email}")
    public ResponseEntity<Void> deleteByEmail(@PathVariable String email) {
        service.deleteByEmail(email);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/purge/{userId}")
    public ResponseEntity<Void> purgeUserData(@PathVariable String userId) {
        service.purgeUserData(userId);
        return ResponseEntity.noContent().build();
    }
}
