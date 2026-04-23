package com.financetracker.controller;

import com.financetracker.model.Investment;
import com.financetracker.service.InvestmentService;
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
        if (userId != null) {
            return service.findAllByUserId(userId);
        }
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<Investment> create(@RequestBody Investment investment, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null && investment.getUserId() == null) {
            investment.setUserId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(investment));
    }

    @PutMapping("/{id}")
    public Investment update(@PathVariable String id, @RequestBody Investment updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
