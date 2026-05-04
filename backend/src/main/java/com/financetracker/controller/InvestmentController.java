package com.financetracker.controller;

import com.financetracker.model.Investment;
import com.financetracker.service.InvestmentService;
import com.financetracker.util.Guards;
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

    @GetMapping
    public List<Investment> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        return service.findAllByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<Investment> create(@RequestBody Investment investment, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Guards.requireUser(userId);
        investment.setUserId(userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(investment));
    }

    @PutMapping("/{id}")
    public Investment update(@PathVariable String id, @RequestBody Investment updates, @RequestHeader(value = "X-User-Id", required = false) String userId) {
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
