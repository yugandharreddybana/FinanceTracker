package com.financetracker.controller;

import com.financetracker.model.BankAccount;
import com.financetracker.service.BankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/accounts")
@RequiredArgsConstructor
public class BankAccountController {
    private final BankAccountService service;

    @GetMapping
    public List<BankAccount> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null) {
            return service.findAllByUserId(userId);
        }
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<BankAccount> create(@RequestBody BankAccount account, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null && account.getUserId() == null) {
            account.setUserId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(account));
    }

    @PutMapping("/{id}")
    public BankAccount update(@PathVariable String id, @RequestBody BankAccount updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
