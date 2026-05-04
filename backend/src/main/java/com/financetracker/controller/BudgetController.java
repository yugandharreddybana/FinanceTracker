package com.financetracker.controller;

import com.financetracker.model.Budget;
import com.financetracker.service.BudgetService;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/budgets")
@RequiredArgsConstructor
public class BudgetController {
    private final BudgetService service;

    @GetMapping
    public List<Budget> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<Budget> create(@RequestBody Budget budget, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        budget.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(budget));
    }

    @PutMapping("/{id}")
    public Budget update(@PathVariable String id, @RequestBody Budget updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
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
