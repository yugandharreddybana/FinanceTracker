package com.financetracker.controller;

import com.financetracker.model.RecurringPayment;
import com.financetracker.service.RecurringPaymentService;
import com.financetracker.util.Guards;
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

    @GetMapping
    public List<RecurringPayment> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<RecurringPayment> create(@RequestBody RecurringPayment payment, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        payment.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(payment));
    }

    @PutMapping("/{id}")
    public RecurringPayment update(@PathVariable String id, @RequestBody RecurringPayment updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
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
