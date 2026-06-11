package com.financetracker.controller;

import com.financetracker.model.Investment;
import com.financetracker.service.InvestmentService;
import com.financetracker.model.PlanFeature;
import com.financetracker.util.Guards;
import com.financetracker.util.PlanGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/investments")
@RequiredArgsConstructor
public class InvestmentController {
    private final InvestmentService service;
    private final PlanGuard planGuard;

    @GetMapping
    public List<Investment> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INVESTMENTS);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<Investment> create(@RequestBody Investment investment, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INVESTMENTS);
        investment.setUserId(userId);
        return ResponseEntity.ok(service.create(investment));
    }

    @PutMapping("/{id}")
    public Investment update(@PathVariable String id, @RequestBody Investment updates, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INVESTMENTS);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.INVESTMENTS);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
