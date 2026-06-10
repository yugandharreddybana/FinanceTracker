package com.financetracker.service;

import com.financetracker.model.AppUser;
import com.financetracker.model.UserProfile;
import com.financetracker.repository.AppUserRepository;
import com.financetracker.repository.UserProfileRepository;
import com.financetracker.util.PasswordUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final AppUserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final UserProfileService userProfileService;

    private static final int PBKDF2_ITERATIONS = 600_000;
    private static final int SALT_LENGTH_BYTES = 32;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public Optional<AppUser> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return userRepository.findByEmailIgnoreCase(email.trim());
    }

    @Transactional(readOnly = true)
    public Optional<AppUser> findById(String id) {
        return userRepository.findById(id);
    }

    @Transactional
    public AppUser register(String email, String password, String displayName) {
        String normalizedEmail = email.toLowerCase().trim();
        
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        String userId = UUID.randomUUID().toString();
        
        // Generate secure 32-byte hex salt
        byte[] saltBytes = new byte[SALT_LENGTH_BYTES];
        random.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        
        String hash = PasswordUtils.hashPassword(password, salt, PBKDF2_ITERATIONS);

        AppUser newUser = AppUser.builder()
                .id(userId)
                .username(normalizedEmail)
                .email(normalizedEmail)
                .displayName(displayName)
                .passwordHash(hash)
                .salt(salt)
                .hashIterations(PBKDF2_ITERATIONS)
                .emailVerified(false)
                .createdAt(Instant.now())
                .passwordChangedAt(Instant.now())
                .build();

        AppUser savedUser = userRepository.save(newUser);

        // Issue 2.002 & 1.008 Fix: Always provision the foundational profile during registration!
        UserProfile profile = UserProfile.builder()
                .id(userId)
                .email(normalizedEmail)
                .name(displayName)
                .role("USER")
                .build();
        profileRepository.save(profile);

        log.info("Successfully registered user and provisioned profile for user ID: {}", userId);
        return savedUser;
    }

    @Transactional
    public AppUser authenticate(String email, String password) {
        String normalizedEmail = email.toLowerCase().trim();
        Optional<AppUser> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOpt.isEmpty()) {
            // Defensive: Compute dummy hash to equalise computation duration
            PasswordUtils.hashPassword(password, "dummy-salt-for-timing-equalisation", PBKDF2_ITERATIONS);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        AppUser user = userOpt.get();
        
        // Handle edge cases where legacy iterations might not be set
        int iterations = user.getHashIterations() != null ? user.getHashIterations() : PBKDF2_ITERATIONS;

        if (!PasswordUtils.verifyPassword(password, user.getSalt(), iterations, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Phase2.0007: Perform lazy iteration upgrades to current standard if we encounter legacy users
        if (iterations < PBKDF2_ITERATIONS) {
            log.info("Upgrading PBKDF2 iteration standard for user ID: {}", user.getId());
            byte[] nextSaltBytes = new byte[SALT_LENGTH_BYTES];
            random.nextBytes(nextSaltBytes);
            String nextSalt = HexFormat.of().formatHex(nextSaltBytes);
            String nextHash = PasswordUtils.hashPassword(password, nextSalt, PBKDF2_ITERATIONS);
            
            user.setSalt(nextSalt);
            user.setPasswordHash(nextHash);
            user.setHashIterations(PBKDF2_ITERATIONS);
            userRepository.save(user);
        }

        return user;
    }

    @Transactional
    public void updatePassword(String userId, String oldPassword, String newPassword) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        int iterations = user.getHashIterations() != null ? user.getHashIterations() : PBKDF2_ITERATIONS;
        if (!PasswordUtils.verifyPassword(oldPassword, user.getSalt(), iterations, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid current password");
        }
        
        if (oldPassword.equals(newPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must differ from the current password");
        }

        byte[] saltBytes = new byte[SALT_LENGTH_BYTES];
        random.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        String hash = PasswordUtils.hashPassword(newPassword, salt, PBKDF2_ITERATIONS);

        user.setSalt(salt);
        user.setPasswordHash(hash);
        user.setHashIterations(PBKDF2_ITERATIONS);
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
        log.info("Successfully updated password for user ID: {}", userId);
    }

    @Transactional
    public void forceResetPassword(String email, String newPassword) {
        AppUser user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        byte[] saltBytes = new byte[SALT_LENGTH_BYTES];
        random.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        String hash = PasswordUtils.hashPassword(newPassword, salt, PBKDF2_ITERATIONS);

        user.setSalt(salt);
        user.setPasswordHash(hash);
        user.setHashIterations(PBKDF2_ITERATIONS);
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
        log.info("Successfully force-reset password for user ID: {}", user.getId());
    }

    @Transactional
    public void setEmailVerified(String email, boolean verified) {
        AppUser user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setEmailVerified(verified);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUserByEmail(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            userProfileService.purgeUserData(user.getId());
            log.info("Executed full user data purge for email: {}", email);
        });
    }
}
