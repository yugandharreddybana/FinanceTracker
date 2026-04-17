package com.financetracker.controller;

import com.financetracker.model.Budget;
import com.financetracker.service.BudgetService;
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
    public List<Budget> getAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<Budget> create(@RequestBody Budget budget) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(budget));
    }

    @PutMapping("/{id}")
    public Budget update(@PathVariable String id, @RequestBody Budget updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
