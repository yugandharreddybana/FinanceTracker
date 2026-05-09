package com.financetracker.controller;

import com.financetracker.model.AppUser;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.financetracker.service.WebAuthnService;
import com.financetracker.repository.AppUserRepository;
import com.financetracker.repository.AuthenticatorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

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
        return userRepository.findByEmail(email)
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
    public String getRegistrationOptions(@RequestBody RegistrationRequest request, HttpSession session) throws Exception {
        PublicKeyCredentialCreationOptions options = webAuthnService.startRegistration(request.getEmail(), request.getName());
        session.setAttribute("registrationOptions", options);
        return options.toCredentialsCreateJson();
    }

    @PostMapping("/register/verify")
    public String verifyRegistration(@RequestBody String responseJson, HttpSession session) throws Exception {
        PublicKeyCredentialCreationOptions options = (PublicKeyCredentialCreationOptions) session.getAttribute("registrationOptions");
        if (options == null) throw new IllegalStateException("Registration session not found");
        
        String userId = webAuthnService.finishRegistration(responseJson, options);
        session.removeAttribute("registrationOptions");
        return userId;
    }

    @PostMapping("/login/options")
    public String getLoginOptions(@RequestBody LoginRequest request, HttpSession session) throws Exception {
        AssertionRequest options = webAuthnService.startAuthentication(request.getEmail());
        session.setAttribute("loginOptions", options);
        return options.toCredentialsGetJson();
    }

    @PostMapping("/login/verify")
    public AppUser verifyLogin(@RequestBody String responseJson, HttpSession session) throws Exception {
        AssertionRequest options = (AssertionRequest) session.getAttribute("loginOptions");
        if (options == null) throw new IllegalStateException("Login session not found");
        
        String userId = webAuthnService.finishAuthentication(responseJson, options);
        session.removeAttribute("loginOptions");
        
        return userRepository.findById(userId).orElse(null);
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
