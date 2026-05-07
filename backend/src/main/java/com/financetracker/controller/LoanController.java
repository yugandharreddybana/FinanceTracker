package com.financetracker.controller;

import com.financetracker.model.Loan;
import com.financetracker.service.LoanService;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finance/loans")
@RequiredArgsConstructor
public class LoanController {
    private final LoanService service;

    @GetMapping
    public List<Loan> getAll(@RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<Loan> create(@RequestBody Loan loan, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        loan.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(loan));
    }

    @PutMapping("/{id}")
    public Loan update(@PathVariable String id, @RequestBody Loan updates, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        return service.update(id, updates, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        Guards.requireUser(userId);
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
