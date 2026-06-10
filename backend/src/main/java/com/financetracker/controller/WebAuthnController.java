package com.financetracker.controller;

import com.financetracker.model.AppUser;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.financetracker.service.WebAuthnService;
import com.financetracker.repository.AppUserRepository;
import com.financetracker.repository.AuthenticatorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import lombok.Data;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth/webauthn")
public class WebAuthnController {

    private final WebAuthnService webAuthnService;
    private final AppUserRepository userRepository;
    private final AuthenticatorRepository authenticatorRepository;

    public WebAuthnController(WebAuthnService webAuthnService, AppUserRepository userRepository, AuthenticatorRepository authenticatorRepository) {
        this.webAuthnService = webAuthnService;
        this.userRepository = userRepository;
        this.authenticatorRepository = authenticatorRepository;
    }

    // Phase2.0009: only the owner of the email may wipe their passkeys.
    // X-User-Id is set by the Express middleware after JWT verification.
    @DeleteMapping("/credentials")
    public ResponseEntity<Void> deleteCredentials(@RequestParam String email,
                                                  @RequestHeader("X-User-Id") String userId) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return userRepository.findByEmailIgnoreCase(email.trim())
                .map(user -> {
                    if (!user.getId().equals(userId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    authenticatorRepository.deleteByUserId(user.getId());
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/register/options")
    public OptionsResponse getRegistrationOptions(
            @RequestBody RegistrationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) throws Exception {
        
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to register passkeys");
        }
        
        AppUser user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User identity not found"));
        
        if (!user.getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        PublicKeyCredentialCreationOptions options = webAuthnService.startRegistration(request.getEmail(), request.getName());
        return new OptionsResponse(options.toCredentialsCreateJson(), options.toJson());
    }

    @PostMapping("/register/verify")
    public String verifyRegistration(
            @RequestBody VerifyRegistrationRequest request,
            @RequestHeader("X-User-Id") String userId) throws Exception {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        
        PublicKeyCredentialCreationOptions options = PublicKeyCredentialCreationOptions.fromJson(request.getSdkOptions());
        if (options == null) throw new IllegalStateException("Registration context not found");
        
        String sessionUserId = new String(options.getUser().getId().getBytes(), StandardCharsets.UTF_8);
        if (!sessionUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return webAuthnService.finishRegistration(request.getResponseJson(), options);
    }

    @PostMapping("/login/options")
    public OptionsResponse getLoginOptions(@RequestBody LoginRequest request) throws Exception {
        AssertionRequest options = webAuthnService.startAuthentication(request.getEmail());
        return new OptionsResponse(options.toCredentialsGetJson(), options.toJson());
    }

    @PostMapping("/login/verify")
    public AppUser verifyLogin(@RequestBody VerifyLoginRequest request) throws Exception {
        AssertionRequest options = AssertionRequest.fromJson(request.getSdkOptions());
        if (options == null) throw new IllegalStateException("Login context not found");
        
        String userId = webAuthnService.finishAuthentication(request.getResponseJson(), options);
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user not found"));
    }

    @Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class OptionsResponse {
        private String browserOptions;
        private String sdkOptions;
    }

    @Data
    public static class VerifyRegistrationRequest {
        private String responseJson;
        private String sdkOptions;
    }

    @Data
    public static class VerifyLoginRequest {
        private String responseJson;
        private String sdkOptions;
    }

    @Data
    public static class RegistrationRequest {
        private String email;
        private String name;
    }

    @Data
    public static class LoginRequest {
        private String email;
    }
}
