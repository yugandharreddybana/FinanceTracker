package com.financetracker.controller;

import com.financetracker.model.BankAccount;
import com.financetracker.service.BankAccountService;
import com.financetracker.util.Guards;
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
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<BankAccount> create(@RequestBody BankAccount account, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        account.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(account));
    }

    @PutMapping("/{id}")
    public BankAccount update(@PathVariable String id, @RequestBody BankAccount updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
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
