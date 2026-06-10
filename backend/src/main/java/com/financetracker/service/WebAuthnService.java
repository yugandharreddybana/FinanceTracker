package com.financetracker.service;

import com.financetracker.model.AppUser;
import com.financetracker.model.Authenticator;
import com.financetracker.repository.AppUserRepository;
import com.financetracker.repository.AuthenticatorRepository;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.RegistrationFailedException;
import com.yubico.webauthn.exception.AssertionFailedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WebAuthnService {

    private static final Logger log = LoggerFactory.getLogger(WebAuthnService.class);

    private final AppUserRepository userRepository;
    private final AuthenticatorRepository authenticatorRepository;
    private final RelyingParty rp;

    public WebAuthnService(AppUserRepository userRepository,
                           AuthenticatorRepository authenticatorRepository,
                           @Value("${app.url:http://localhost:3000}") String appUrl,
                           @Value("${WEBAUTHN_RP_ID:localhost}") String rpId,
                           @Value("${WEBAUTHN_ORIGINS:}") String rpOrigins) {
        this.userRepository = userRepository;
        this.authenticatorRepository = authenticatorRepository;

        // Phase2.0011: RP ID must be the registrable domain in production. Credentials
        // are bound to this value — changing it invalidates every existing passkey.
        RelyingPartyIdentity rpIdentity = RelyingPartyIdentity.builder()
                .id(rpId)
                .name("Finance Tracker")
                .build();

        Set<String> origins = new HashSet<>();
        if (rpOrigins != null && !rpOrigins.isBlank()) {
            for (String o : rpOrigins.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }
        if (origins.isEmpty()) origins.add(appUrl);

        this.rp = RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(new CredentialRepositoryBridge())
                .origins(origins)
                .build();
    }

    public PublicKeyCredentialCreationOptions startRegistration(String email, String name) {
        AppUser user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User identity not found. Please register first."));

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(user.getDisplayName())
                .id(new ByteArray(user.getId().getBytes(StandardCharsets.UTF_8)))
                .build();

        return rp.startRegistration(StartRegistrationOptions.builder()
                .user(userIdentity)
                .build());
    }

    public String finishRegistration(String responseJson, PublicKeyCredentialCreationOptions options) throws RegistrationFailedException, IOException {
        RegistrationResult result = rp.finishRegistration(FinishRegistrationOptions.builder()
                .request(options)
                .response(PublicKeyCredential.parseRegistrationResponseJson(responseJson))
                .build());

        String userId = new String(options.getUser().getId().getBytes(), StandardCharsets.UTF_8);
        String credentialId = Base64.getEncoder().encodeToString(result.getKeyId().getId().getBytes());
        String publicKey = Base64.getEncoder().encodeToString(result.getPublicKeyCose().getBytes());

        Authenticator auth = Authenticator.builder()
                .credentialId(credentialId)
                .userId(userId)
                .publicKey(publicKey)
                .signCount(result.getSignatureCount())
                .build();
        
        authenticatorRepository.save(auth);
        return userId;
    }

    public AssertionRequest startAuthentication(String email) {
        return rp.startAssertion(StartAssertionOptions.builder()
                .username(Optional.ofNullable(email))
                .build());
    }

    public String finishAuthentication(String responseJson, AssertionRequest request) throws AssertionFailedException, IOException {
        AssertionResult result = rp.finishAssertion(FinishAssertionOptions.builder()
                .request(request)
                .response(PublicKeyCredential.parseAssertionResponseJson(responseJson))
                .build());

        if (result.isSuccess()) {
            String credentialId = Base64.getEncoder().encodeToString(result.getCredentialId().getBytes());
            Authenticator auth = authenticatorRepository.findByCredentialId(credentialId)
                .orElseThrow(() -> new AssertionFailedException("Credential not found"));
            
            long newCount = result.getSignatureCount();
            long oldCount = auth.getSignCount();

            // FIDO2 Rollback attack protection: If the authenticator provides a signature count
            // and it is NOT strictly higher than what we previously recorded (when previously recorded > 0),
            // someone cloned the authenticator or is replaying an old credential.
            if (oldCount > 0 && newCount <= oldCount) {
                log.error("FIDO2 SECURITY EXCEPTION: Rollback attack suspected for credentialId {}! Expected signCount > {}, but received {}", 
                    credentialId, oldCount, newCount);
                throw new AssertionFailedException("Authenticator signCount check failed. Suspected clone or rollback attack.");
            }

            auth.setSignCount(newCount);
            authenticatorRepository.save(auth);
            
            return auth.getUserId();
        }
        throw new AssertionFailedException("Authentication failed");
    }

    private class CredentialRepositoryBridge implements CredentialRepository {
        @Override
        public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
            Optional<AppUser> user = userRepository.findByUsernameIgnoreCase(username.trim());
            return user.map(appUser -> authenticatorRepository.findAllByUserId(appUser.getId()).stream()
                    .map(auth -> PublicKeyCredentialDescriptor.builder()
                            .id(new ByteArray(Base64.getDecoder().decode(auth.getCredentialId())))
                            .build())
                    .collect(Collectors.toSet())).orElse(Collections.emptySet());
        }

        @Override
        public Optional<ByteArray> getUserHandleForUsername(String username) {
            return userRepository.findByUsernameIgnoreCase(username.trim()).map(u -> new ByteArray(u.getId().getBytes(StandardCharsets.UTF_8)));
        }

        @Override
        public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
            return userRepository.findById(new String(userHandle.getBytes(), StandardCharsets.UTF_8)).map(AppUser::getUsername);
        }

        @Override
        public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
            String idStr = Base64.getEncoder().encodeToString(credentialId.getBytes());
            return authenticatorRepository.findByCredentialId(idStr)
                    .map(auth -> RegisteredCredential.builder()
                            .credentialId(new ByteArray(Base64.getDecoder().decode(auth.getCredentialId())))
                            .userHandle(new ByteArray(auth.getUserId().getBytes(StandardCharsets.UTF_8)))
                            .publicKeyCose(new ByteArray(Base64.getDecoder().decode(auth.getPublicKey())))
                            .signatureCount(auth.getSignCount())
                            .build());
        }

        @Override
        public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
            String idStr = Base64.getEncoder().encodeToString(credentialId.getBytes());
            return authenticatorRepository.findByCredentialId(idStr)
                    .map(auth -> Collections.singleton(RegisteredCredential.builder()
                            .credentialId(new ByteArray(Base64.getDecoder().decode(auth.getCredentialId())))
                            .userHandle(new ByteArray(auth.getUserId().getBytes(StandardCharsets.UTF_8)))
                            .publicKeyCose(new ByteArray(Base64.getDecoder().decode(auth.getPublicKey())))
                            .signatureCount(auth.getSignCount())
                            .build()))
                    .orElse(Collections.emptySet());
        }
    }
}
