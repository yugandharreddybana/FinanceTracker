package com.financetracker.controller;

import com.financetracker.model.SavingsGoal;
import com.financetracker.service.SavingsGoalService;
import com.financetracker.util.Guards;
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
    public List<SavingsGoal> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<SavingsGoal> create(@RequestBody SavingsGoal goal, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        goal.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(goal));
    }

    @PutMapping("/{id}")
    public SavingsGoal update(@PathVariable String id, @RequestBody SavingsGoal updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
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
