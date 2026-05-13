package com.financetracker.config;

import com.financetracker.exception.NotFoundException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.OptimisticLockException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.StaleObjectStateException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ISSUE #19 FIX:
 * - Internal class names, IDs, and stack traces are NEVER returned to the client.
 * - All errors include a correlationId so engineers can trace logs without exposing internals.
 * - Bean validation errors return field-level detail (safe, from our own annotations).
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
            .body(Map.of("error", e.getReason() != null ? e.getReason() : "Request failed"));
    }

    // ISSUE #12 FIX: Return field-level validation errors from @Valid — safe to expose
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> fieldErrors = e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                org.springframework.validation.FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                (a, b) -> a
            ));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "Validation failed", "fields", fieldErrors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraint(ConstraintViolationException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "Validation failed: " + e.getMessage()));
    }

    // Phase4.0007: typed 404 signal — replaces fragile string matching on
    // RuntimeException.getMessage().contains("not found"), which previously
    // reclassified internal cache misses ("payload not found in cache") as 404.
    @ExceptionHandler({NotFoundException.class, EntityNotFoundException.class})
    public ResponseEntity<Map<String, String>> handleNotFound(RuntimeException e) {
        String correlationId = UUID.randomUUID().toString();
        log.info("[{}] Resource not found: {}", correlationId, e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", "Resource not found", "correlationId", correlationId));
    }

    // Phase4.0006: missing required headers (e.g. X-User-Id) → 400 BAD_REQUEST.
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, String>> handleMissingHeader(MissingRequestHeaderException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("error", "Missing required header: " + e.getHeaderName()));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> handleOle(ObjectOptimisticLockingFailureException e) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("[{}] Optimistic locking conflict: {}", correlationId, e.getMessage());
        com.financetracker.debug.AgentDebugLog.log(
            "H7",
            "GlobalExceptionHandler.handleOle",
            "conflict",
            java.util.Map.of("correlationId", correlationId)
        );
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "Concurrent update conflict — please retry", "correlationId", correlationId));
    }

    @ExceptionHandler(OptimisticLockException.class)
    public ResponseEntity<Map<String, String>> handleJpaOptLock(OptimisticLockException e) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("[{}] JPA optimistic lock: {}", correlationId, e.getMessage());
        com.financetracker.debug.AgentDebugLog.log(
            "H10",
            "GlobalExceptionHandler.handleJpaOptLock",
            "conflict",
            java.util.Map.of("correlationId", correlationId)
        );
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "Concurrent update conflict — please retry", "correlationId", correlationId));
    }

    @ExceptionHandler(StaleObjectStateException.class)
    public ResponseEntity<Map<String, String>> handleStaleObject(StaleObjectStateException e) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("[{}] Stale row (Hibernate): {}", correlationId, e.getMessage());
        com.financetracker.debug.AgentDebugLog.log(
            "H11",
            "GlobalExceptionHandler.handleStaleObject",
            "conflict",
            java.util.Map.of("correlationId", correlationId)
        );
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "Concurrent update conflict — please retry", "correlationId", correlationId));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<Map<String, String>> handleTransactionSystem(TransactionSystemException e) {
        Throwable cur = e;
        while (cur != null) {
            if (cur instanceof ObjectOptimisticLockingFailureException ole) {
                return handleOle(ole);
            }
            if (cur instanceof OptimisticLockException oleJpa) {
                return handleJpaOptLock(oleJpa);
            }
            if (cur instanceof StaleObjectStateException stale) {
                return handleStaleObject(stale);
            }
            cur = cur.getCause();
        }
        String correlationId = UUID.randomUUID().toString();
        log.error("[{}] TransactionSystemException (no OLE cause): {}", correlationId, e.getMessage(), e);
        com.financetracker.debug.AgentDebugLog.log(
            "H8",
            "GlobalExceptionHandler.handleTransactionSystem",
            "tx-system→500",
            java.util.Map.of("correlationId", correlationId)
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "An unexpected error occurred", "correlationId", correlationId));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException e) {
        String correlationId = UUID.randomUUID().toString();
        log.error("[{}] Unhandled RuntimeException: {}", correlationId, e.getMessage(), e);
        // #region agent log
        String em = e.getMessage() != null ? e.getMessage() : "";
        com.financetracker.debug.AgentDebugLog.log(
            "H2",
            "GlobalExceptionHandler.handleRuntime",
            "runtime→500",
            java.util.Map.of(
                "correlationId", correlationId,
                "ex", e.getClass().getSimpleName(),
                "msg", em.length() > 220 ? em.substring(0, 220) : em
            )
        );
        // #endregion
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "An unexpected error occurred", "correlationId", correlationId));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAll(Exception e) {
        String correlationId = UUID.randomUUID().toString();
        log.error("[{}] Uncaught exception: {}", correlationId, e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "An unexpected error occurred", "correlationId", correlationId));
    }
}
