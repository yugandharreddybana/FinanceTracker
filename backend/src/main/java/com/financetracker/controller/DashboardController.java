package com.financetracker.controller;

import com.financetracker.model.DashboardSnapshot;
import com.financetracker.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ISSUE #14 FIX: Exposes the server-side net worth and financial health snapshot.
 * The X-User-Id header is injected by the Node proxy from the verified JWT — never
 * from client input.
 */
@RestController
@RequestMapping("/api/finance/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/snapshot")
    public ResponseEntity<DashboardSnapshot> getSnapshot(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(dashboardService.getSnapshot(userId));
    }
}
