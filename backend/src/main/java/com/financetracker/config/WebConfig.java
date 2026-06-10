package com.financetracker.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
public class WebConfig {

    @Value("${app.allowed-origins}")
    private String allowedOrigins;

    // Phase4.0003: only the Express middleware should ever appear in this list.
    // The frontend talks to the middleware, never directly to Spring. If a Vercel
    // origin slips into JAVA_ALLOWED_ORIGINS the trust boundary collapses — browsers
    // could call this backend with credentials and bypass middleware-only checks.
    private static final List<String> FORBIDDEN_HOST_FRAGMENTS = List.of(".vercel.app", ".netlify.app");

    @PostConstruct
    void validate() {
        if (allowedOrigins == null) return;
        List<String> bad = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .filter(s -> FORBIDDEN_HOST_FRAGMENTS.stream().anyMatch(s.toLowerCase()::contains))
            .toList();
        if (!bad.isEmpty()) {
            throw new IllegalStateException(
                "JAVA_ALLOWED_ORIGINS must not contain a frontend host (vercel/netlify): " + bad
                + ". Frontend traffic must flow through the Express middleware.");
        }
        log.info("[CORS] Backend allowed origins validated: {}", allowedOrigins);
    }

}
