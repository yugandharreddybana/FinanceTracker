package com.financetracker.util;

import java.util.Set;

public final class SupportedCurrencies {
    public static final Set<String> ALLOWED = Set.of("EUR", "INR");

    private SupportedCurrencies() {}

    public static String normalize(String currency) {
        if (currency == null || currency.isBlank()) return null;
        String upper = currency.trim().toUpperCase();
        if (!ALLOWED.contains(upper)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Currency must be EUR or INR");
        }
        return upper;
    }
}
