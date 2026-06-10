package com.financetracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.repository.AppUserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

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

/**
 * Phase3.0004 & Phase4.0004: Defence-in-depth JWT verification integrated with Spring Security.
 * Validates user JWTs, extracts 'uid' claims, and enforces password reset revocation lists.
 * Also handles "system-internal" system tokens for secure server-to-server Express queries.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String jwtSecret;

    private final AppUserRepository userRepository;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @PostConstruct
    void validate() {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "JWT_SECRET must be >= 32 characters; backend cannot start without a shared signing secret.");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String method = req.getMethod();

        // Direct pass-through for pre-flight requests (handled by CORS Configuration Source)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(req, res);
            return;
        }

        String header = req.getHeader("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            // No token found; proceed through the chain so Spring Security can enforce permitAll/authenticated
            chain.doFilter(req, res);
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

        UsernamePasswordAuthenticationToken authentication;

        // Secure System-to-System override using trusted shared-secret JWT
        if ("system-internal".equals(uid)) {
            authentication = new UsernamePasswordAuthenticationToken(
                    "system-internal", null, List.of(new SimpleGrantedAuthority("ROLE_SYSTEM")));
        } else {
            // Regular user validation against DB and token revocation policies
            Object iat = claims.get("iat");
            if (iat instanceof Number) {
                long iatSec = ((Number) iat).longValue();
                var userOpt = userRepository.findById(uid);
                if (userOpt.isEmpty()) {
                    deny(res, "User not found");
                    return;
                }
                var user = userOpt.get();
                if (user.getPasswordChangedAt() != null) {
                    long changedSec = user.getPasswordChangedAt().getEpochSecond();
                    if (iatSec < changedSec - 5) { // 5-second buffer
                        deny(res, "Token revoked due to password update");
                        return;
                    }
                }
            }
            authentication = new UsernamePasswordAuthenticationToken(
                    uid, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        }

        // Populate Spring Security Context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Wrap request to maintain backward compatibility for controllers expecting X-User-Id
        chain.doFilter(new HeaderOverrideRequest(req, "X-User-Id", uid), res);
    }

    private Map<String, Object> verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes;
            try {
                signatureBytes = Base64.getUrlDecoder().decode(parts[2]);
            } catch (IllegalArgumentException ex) {
                return null;
            }
            if (signatureBytes.length != computed.length) return null;
            if (!MessageDigest.isEqual(signatureBytes, computed)) return null;

            byte[] headerJson = Base64.getUrlDecoder().decode(parts[0]);
            @SuppressWarnings("unchecked")
            Map<String, Object> header = MAPPER.readValue(headerJson, Map.class);
            
            // Phase2.0007: strict alg and typ validation
            if (!"HS256".equals(header.get("alg"))) return null;
            if (!"JWT".equalsIgnoreCase((String) header.get("typ"))) return null;

            byte[] payloadJson = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = MAPPER.readValue(payloadJson, Map.class);

            Object exp = payload.get("exp");
            if (!(exp instanceof Number)) return null;
            long now = System.currentTimeMillis() / 1000L;
            if (((Number) exp).longValue() < now) return null;

            Object iat = payload.get("iat");
            if (!(iat instanceof Number) || ((Number) iat).longValue() > now + 60L) return null;

            // Phase2.0007: nbf validation
            Object nbf = payload.get("nbf");
            if (nbf instanceof Number && ((Number) nbf).longValue() > now + 60L) return null;

            // Phase2.0007: strict iss and aud validation
            if (!"finance-tracker-auth".equals(payload.get("iss"))) return null;
            if (!"finance-tracker-api".equals(payload.get("aud"))) return null;

            return payload;
        } catch (Exception ex) {
            return null;
        }
    }

    private void deny(HttpServletResponse res, String reason) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        MAPPER.writeValue(res.getWriter(), Map.of("error", reason));
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
