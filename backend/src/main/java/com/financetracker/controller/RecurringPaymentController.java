package com.financetracker.controller;

import com.financetracker.model.RecurringPayment;
import com.financetracker.service.RecurringPaymentService;
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
        if (userId != null) {
            return service.findAllByUserId(userId);
        }
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<RecurringPayment> create(@RequestBody RecurringPayment payment, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null && payment.getUserId() == null) {
            payment.setUserId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(payment));
    }

    @PutMapping("/{id}")
    public RecurringPayment update(@PathVariable String id, @RequestBody RecurringPayment updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
