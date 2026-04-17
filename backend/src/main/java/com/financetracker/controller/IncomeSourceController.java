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
    public List<IncomeSource> getAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<IncomeSource> create(@RequestBody IncomeSource income) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(income));
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
