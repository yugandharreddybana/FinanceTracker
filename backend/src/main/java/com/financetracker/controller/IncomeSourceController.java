package com.financetracker.controller;

import com.financetracker.model.IncomeSource;
import com.financetracker.service.IncomeSourceService;
import com.financetracker.model.PlanFeature;
import com.financetracker.util.Guards;
import com.financetracker.util.PlanGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/income-sources")
@RequiredArgsConstructor
public class IncomeSourceController {
    private final IncomeSourceService service;
    private final PlanGuard planGuard;

    @GetMapping
    public List<IncomeSource> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INCOME);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<IncomeSource> create(@RequestBody IncomeSource source, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INCOME);
        source.setUserId(userId);
        return ResponseEntity.ok(service.create(source));
    }

    @PutMapping("/{id}")
    public IncomeSource update(@PathVariable String id, @RequestBody IncomeSource updates, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INCOME);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INCOME);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
