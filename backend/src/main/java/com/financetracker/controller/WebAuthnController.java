package com.financetracker.controller;

import com.financetracker.model.AppUser;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.financetracker.service.WebAuthnService;
import com.financetracker.repository.AppUserRepository;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/webauthn")
@CrossOrigin(origins = "*")
public class WebAuthnController {

    private final WebAuthnService webAuthnService;
    private final AppUserRepository userRepository;

    public WebAuthnController(WebAuthnService webAuthnService, AppUserRepository userRepository) {
        this.webAuthnService = webAuthnService;
        this.userRepository = userRepository;
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
