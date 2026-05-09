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
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WebAuthnService {

    private final AppUserRepository userRepository;
    private final AuthenticatorRepository authenticatorRepository;
    private final RelyingParty rp;

    public WebAuthnService(AppUserRepository userRepository, 
                           AuthenticatorRepository authenticatorRepository,
                           @Value("${app.url:http://localhost:3000}") String appUrl) {
        this.userRepository = userRepository;
        this.authenticatorRepository = authenticatorRepository;

        RelyingPartyIdentity rpIdentity = RelyingPartyIdentity.builder()
                .id("localhost") // In production, this should be the domain
                .name("Finance Tracker")
                .build();

        this.rp = RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(new CredentialRepositoryBridge())
                .origins(Collections.singleton(appUrl))
                .build();
    }

    public PublicKeyCredentialCreationOptions startRegistration(String email, String name) {
        AppUser user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    AppUser newUser = AppUser.builder()
                            .id(UUID.randomUUID().toString())
                            .email(email)
                            .username(email)
                            .displayName(name)
                            .build();
                    return userRepository.save(newUser);
                });

        UserIdentity userIdentity = UserIdentity.builder()
                .name(user.getEmail())
                .displayName(user.getDisplayName())
                .id(new ByteArray(user.getId().getBytes()))
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

        String userId = new String(options.getUser().getId().getBytes());
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
            
            auth.setSignCount(result.getSignatureCount());
            authenticatorRepository.save(auth);
            
            return auth.getUserId();
        }
        throw new AssertionFailedException("Authentication failed");
    }

    private class CredentialRepositoryBridge implements CredentialRepository {
        @Override
        public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
            Optional<AppUser> user = userRepository.findByUsername(username);
            return user.map(appUser -> authenticatorRepository.findAllByUserId(appUser.getId()).stream()
                    .map(auth -> PublicKeyCredentialDescriptor.builder()
                            .id(new ByteArray(Base64.getDecoder().decode(auth.getCredentialId())))
                            .build())
                    .collect(Collectors.toSet())).orElse(Collections.emptySet());
        }

        @Override
        public Optional<ByteArray> getUserHandleForUsername(String username) {
            return userRepository.findByUsername(username).map(u -> new ByteArray(u.getId().getBytes()));
        }

        @Override
        public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
            return userRepository.findById(new String(userHandle.getBytes())).map(AppUser::getUsername);
        }

        @Override
        public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
            String idStr = Base64.getEncoder().encodeToString(credentialId.getBytes());
            return authenticatorRepository.findByCredentialId(idStr)
                    .map(auth -> RegisteredCredential.builder()
                            .credentialId(new ByteArray(Base64.getDecoder().decode(auth.getCredentialId())))
                            .userHandle(new ByteArray(auth.getUserId().getBytes()))
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
                            .userHandle(new ByteArray(auth.getUserId().getBytes()))
                            .publicKeyCose(new ByteArray(Base64.getDecoder().decode(auth.getPublicKey())))
                            .signatureCount(auth.getSignCount())
                            .build()))
                    .orElse(Collections.emptySet());
        }
    }
}
