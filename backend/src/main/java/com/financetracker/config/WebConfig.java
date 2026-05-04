package com.financetracker.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig {

    @Value("${ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

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
                    // ISSUE #18 FIX: X-Idempotency-Key added — required for transaction dedup
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
