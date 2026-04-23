package com.financetracker.controller;

import com.financetracker.model.IncomeSource;
import com.financetracker.service.IncomeSourceService;
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

    @GetMapping
    public List<IncomeSource> getAll(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null) {
            return service.findAllByUserId(userId);
        }
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<IncomeSource> create(@RequestBody IncomeSource source, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId != null && source.getUserId() == null) {
            source.setUserId(userId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(source));
    }

    @PutMapping("/{id}")
    public IncomeSource update(@PathVariable String id, @RequestBody IncomeSource updates) {
        return service.update(id, updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
