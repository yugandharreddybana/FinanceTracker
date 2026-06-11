package com.financetracker.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Phase3.0004: Enterprise-grade Spring Security setup.
 * Replaces basic custom FilterRegistrationBean with standard Spring Security Context.
 * Defines explicit whitelist, protects all REST APIs under /api/**, and restricts
 * H2 console to localhost/dev profiles.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${spring.profiles.active:dev}")
    private String activeProfiles;

    @Value("${app.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        boolean isDev = Arrays.asList(activeProfiles.split(",")).contains("dev");

        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                // Permit all pre-flight OPTIONS requests
                auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll();
                
                // Whitelist public API entry points
                auth.requestMatchers("/api/health").permitAll();
                auth.requestMatchers("/api/auth/login").permitAll();
                auth.requestMatchers("/api/auth/register").permitAll();
                auth.requestMatchers("/api/auth/webauthn/login/**").permitAll();
                
                // Phase3.0005: Limit H2 console endpoints strictly to dev profile
                if (isDev) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }
                
                // Lock down all business logic endpoints
                auth.requestMatchers("/api/**").authenticated();
                auth.anyRequest().denyAll();
            });

        // Permit iframe rendering for H2 console in local dev only
        if (isDev) {
            http.headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin));
        }

        // Insert JWT extraction & verification filter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = new java.util.ArrayList<>();
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
        
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
            "Authorization", 
            "Content-Type", 
            "X-User-Id", 
            "X-Requested-With", 
            "X-Idempotency-Key",
            "X-Subscription-Sync-Secret"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
