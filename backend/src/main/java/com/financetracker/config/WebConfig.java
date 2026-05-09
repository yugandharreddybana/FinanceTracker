package com.financetracker.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
public class WebConfig {

    @Value("${app.allowed-origins}")
    private String allowedOrigins;

    // Phase4.0003: only the Express middleware should ever appear in this list.
    // The frontend talks to the middleware, never directly to Spring. If a Vercel
    // origin slips into ALLOWED_ORIGINS the trust boundary collapses — browsers
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
                "Backend ALLOWED_ORIGINS must not contain a frontend host (vercel/netlify): " + bad
                + ". Frontend traffic must flow through the Express middleware.");
        }
        log.info("[CORS] Backend allowed origins validated: {}", allowedOrigins);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                List<String> origins = new ArrayList<>();
                if (allowedOrigins != null && !allowedOrigins.isBlank()) {
                    Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(origins::add);
                }
                if (origins.isEmpty()) {
                    origins.add("http://localhost:3000");
                    origins.add("http://localhost:5173");
                }
                registry.addMapping("/api/**")
                    .allowedOrigins(origins.toArray(new String[0]))
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders(
                        "Authorization",
                        "Content-Type",
                        "X-User-Id",
                        "X-Requested-With",
                        "X-Idempotency-Key"
                    )
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
