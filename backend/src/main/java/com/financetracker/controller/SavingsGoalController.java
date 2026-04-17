package com.financetracker.controller;

import com.financetracker.model.SavingsGoal;
import com.financetracker.service.SavingsGoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/savings-goals")
@RequiredArgsConstructor
public class SavingsGoalController {
    private final SavingsGoalService service;

    @GetMapping
    public List<SavingsGoal> getAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<SavingsGoal> create(@RequestBody SavingsGoal goal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(goal));
    }

    @PutMapping("/{id}")
    public SavingsGoal update(@PathVariable String id, @RequestBody SavingsGoal updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
