package com.financetracker.controller;

import com.financetracker.model.FamilyAccount;
import com.financetracker.service.FamilyAccountService;
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
    public List<FamilyAccount> getAll() {
        return service.findAll();
    }

    @SuppressWarnings("null")
    @GetMapping("/{id}")
    public ResponseEntity<FamilyAccount> getById(@PathVariable String id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<FamilyAccount> create(@RequestBody FamilyAccount family) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(family));
    }

    @PutMapping("/{id}")
    public FamilyAccount update(@PathVariable String id, @RequestBody FamilyAccount updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
