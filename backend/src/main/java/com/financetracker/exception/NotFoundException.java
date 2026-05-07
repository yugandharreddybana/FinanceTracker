package com.financetracker.exception;

// Phase4.0007: typed signal for "entity not found" — replaces fragile string
// matching on RuntimeException.getMessage() in GlobalExceptionHandler.
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
