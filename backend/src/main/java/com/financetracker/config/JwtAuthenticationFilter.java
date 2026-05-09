package com.financetracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Phase4.0004: defence-in-depth JWT verification at the Spring boundary. The
// Express middleware already validates JWTs before proxying, but a misconfigured
// Railway deploy or accidental public DNS would otherwise expose every endpoint
// to anyone setting X-User-Id: <victim>. With this filter active, requests that
// reach Spring without a valid Bearer token are rejected outright; on success
// the X-User-Id header is overwritten with the verified JWT uid so downstream
// controllers can never trust a client-supplied value.
@Slf4j
@Configuration
public class JwtAuthenticationFilter {

    @Value("${JWT_SECRET:}")
    private String jwtSecret;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // Endpoints that legitimately run before authentication (login flow + health).
    private static final List<String> UNAUTHENTICATED_PREFIXES = List.of(
        "/api/health",
        "/api/auth/webauthn/login/options",
        "/api/auth/webauthn/login/verify",
        "/api/auth/webauthn/register/options",
        "/api/auth/webauthn/register/verify"
    );

    @PostConstruct
    void validate() {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "JWT_SECRET must be >= 32 characters; backend cannot start without a shared signing secret.");
        }
    }

    @Bean
    public FilterRegistrationBean<Filter> jwtFilter() {
        FilterRegistrationBean<Filter> reg = new FilterRegistrationBean<>();
        reg.setFilter(new Filter() {
            @Override
            public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                    throws IOException, ServletException {
                HttpServletRequest req = (HttpServletRequest) request;
                HttpServletResponse res = (HttpServletResponse) response;
                String path = req.getRequestURI();
                String method = req.getMethod();

                if ("OPTIONS".equalsIgnoreCase(method)) {
                    chain.doFilter(req, res);
                    return;
                }
                for (String prefix : UNAUTHENTICATED_PREFIXES) {
                    if (path.startsWith(prefix)) {
                        chain.doFilter(req, res);
                        return;
                    }
                }

                String header = req.getHeader("Authorization");
                if (header == null || !header.startsWith("Bearer ")) {
                    deny(res, "Missing bearer token");
                    return;
                }
                Map<String, Object> claims = verify(header.substring(7));
                if (claims == null) {
                    deny(res, "Invalid or expired token");
                    return;
                }
                String uid = (String) claims.get("uid");
                if (uid == null || uid.isBlank()) {
                    deny(res, "Token missing uid");
                    return;
                }

                chain.doFilter(new HeaderOverrideRequest(req, "X-User-Id", uid), res);
            }
        });
        reg.addUrlPatterns("/api/*");
        reg.setOrder(1);
        return reg;
    }

    private Map<String, Object> verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
            String expected = Base64.getUrlEncoder().withoutPadding().encodeToString(computed);

            byte[] sigBytes = parts[2].getBytes(StandardCharsets.UTF_8);
            byte[] expBytes = expected.getBytes(StandardCharsets.UTF_8);
            if (sigBytes.length != expBytes.length) return null;
            if (!MessageDigest.isEqual(sigBytes, expBytes)) return null;

            byte[] payloadJson = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = MAPPER.readValue(payloadJson, Map.class);

            Object exp = payload.get("exp");
            if (!(exp instanceof Number)) return null;
            long now = System.currentTimeMillis() / 1000L;
            if (((Number) exp).longValue() < now) return null;

            Object iat = payload.get("iat");
            if (!(iat instanceof Number) || ((Number) iat).longValue() > now + 60L) return null;

            return payload;
        } catch (Exception ex) {
            return null;
        }
    }

    private void deny(HttpServletResponse res, String reason) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + reason + "\"}");
    }

    /** Wraps the request so getHeader("X-User-Id") returns the verified JWT uid,
     *  regardless of what the client sent. */
    private static final class HeaderOverrideRequest extends HttpServletRequestWrapper {
        private final String headerName;
        private final String headerValue;

        HeaderOverrideRequest(HttpServletRequest req, String headerName, String headerValue) {
            super(req);
            this.headerName = headerName;
            this.headerValue = headerValue;
        }

        @Override
        public String getHeader(String name) {
            if (headerName.equalsIgnoreCase(name)) return headerValue;
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (headerName.equalsIgnoreCase(name)) {
                return Collections.enumeration(List.of(headerValue));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            Set<String> names = new HashSet<>();
            Enumeration<String> orig = super.getHeaderNames();
            while (orig.hasMoreElements()) names.add(orig.nextElement());
            names.add(headerName);
            return Collections.enumeration(names);
        }
    }
}
