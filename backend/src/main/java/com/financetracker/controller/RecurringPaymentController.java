package com.financetracker.controller;

import com.financetracker.model.RecurringPayment;
import com.financetracker.service.RecurringPaymentService;
import com.financetracker.model.PlanFeature;
import com.financetracker.util.Guards;
import com.financetracker.util.PlanGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/recurring-payments")
@RequiredArgsConstructor
public class RecurringPaymentController {
    private final RecurringPaymentService service;
    private final PlanGuard planGuard;

    @GetMapping
    public List<RecurringPayment> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.RECURRING);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<RecurringPayment> create(@RequestBody RecurringPayment payment, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.RECURRING);
        payment.setUserId(userId);
        return ResponseEntity.ok(service.create(payment));
    }

    @PutMapping("/{id}")
    public RecurringPayment update(@PathVariable String id, @RequestBody RecurringPayment updates, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.RECURRING);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        planGuard.requireFeature(userId, PlanFeature.RECURRING);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
