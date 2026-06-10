package com.financetracker.controller;

import com.financetracker.model.AppUser;
import com.financetracker.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AppUser> register(@RequestBody RegisterRequest request) {
        AppUser user = userService.register(request.getEmail(), request.getPassword(), request.getName());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<AppUser> login(@RequestBody LoginRequest request) {
        AppUser user = userService.authenticate(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest request) {
        userService.updatePassword(request.getUserId(), request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequest request) {
        userService.forceResetPassword(request.getEmail(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@RequestBody VerifyEmailRequest request) {
        userService.setEmailVerified(request.getEmail(), true);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/by-email")
    public ResponseEntity<Void> deleteByEmail(@RequestParam String email) {
        userService.deleteUserByEmail(email);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/find-user")
    public ResponseEntity<AppUser> findUser(@RequestParam String email) {
        return userService.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/find-user-by-id")
    public ResponseEntity<AppUser> findUserById(@RequestParam String id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Data Classes for JSON Mapping ---

    @Data
    public static class RegisterRequest {
        private String email;
        private String password;
        private String name;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class ChangePasswordRequest {
        private String userId;
        private String oldPassword;
        private String newPassword;
    }

    @Data
    public static class ResetPasswordRequest {
        private String email;
        private String newPassword;
    }

    @Data
    public static class VerifyEmailRequest {
        private String email;
    }
}
