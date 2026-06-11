package com.financetracker.service;

import com.financetracker.model.FamilyAccount;
import com.financetracker.model.FamilyInvitation;
import com.financetracker.repository.FamilyAccountRepository;
import com.financetracker.repository.FamilyInvitationRepository;
import com.financetracker.util.Guards;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
public class FamilyAccountService {
    private final FamilyAccountRepository repo;
    private final FamilyInvitationRepository invitationRepo;
    private final PlanLimitService planLimitService;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    private final ConcurrentHashMap<String, Integer> failCountMap = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> lockoutMap = new ConcurrentHashMap<>();

    // ISSUE #11 FIX: Queries families where user is owner OR a member
    @Transactional(readOnly = true)
    public List<FamilyAccount> findAllForUser(String userId) {
        return repo.findAllByOwnerOrMember(userId);
    }

    @Transactional(readOnly = true)
    public Optional<FamilyAccount> findByIdForUser(String id, String userId) {
        return repo.findActiveById(id).filter(f -> isOwnerOrMember(f, userId));
    }

    private boolean isOwnerOrMember(FamilyAccount f, String userId) {
        if (userId == null) return false;
        if (userId.equals(f.getOwnerId())) return true;
        return f.getMembers() != null &&
            f.getMembers().stream().anyMatch(m -> userId.equals(m.getUid()));
    }

    @Transactional
    public FamilyAccount create(FamilyAccount family) {
        planLimitService.assertCanAccessFeature(family.getOwnerId(), com.financetracker.model.PlanFeature.FAMILY);
        // ISSUE #16 FIX: UUID-based ID
        family.setId("fam-" + UUID.randomUUID());
        // ISSUE #10 FIX: Owner starts as sole member — no other UIDs injected at creation
        family.setMembers(List.of(new FamilyAccount.FamilyMember(
            family.getOwnerId(), null, "OWNER"
        )));
        return repo.save(family);
    }

    @Transactional
    public FamilyAccount update(String id, FamilyAccount updates, String requestUserId) {
        FamilyAccount existing = repo.findActiveById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getSharedBudgets() != null) existing.setSharedBudgets(updates.getSharedBudgets());
        if (updates.getSharedAccounts() != null) existing.setSharedAccounts(updates.getSharedAccounts());
        // ISSUE #10 FIX: members list is NEVER overwritten from client input here
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        FamilyAccount existing = repo.findActiveById(id)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        // ISSUE #22 FIX: Soft-delete
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }

    // ISSUE #10 FIX: Invitation flow — owner sends invite, invitee must accept
    @Transactional
    public FamilyInvitation inviteMember(String familyId, String inviterId, String inviteeEmail) {
        FamilyAccount family = repo.findActiveById(familyId)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
        Guards.assertOwner(family.getOwnerId(), inviterId);
        FamilyInvitation inv = FamilyInvitation.builder()
            .id(UUID.randomUUID().toString())
            .familyId(familyId)
            .inviterId(inviterId)
            .inviteeEmail(inviteeEmail)
            .token(signToken(UUID.randomUUID().toString()))
            .status(FamilyInvitation.InvitationStatus.PENDING)
            .createdAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(72 * 3600))
            .build();
        return invitationRepo.save(inv);
    }

    // ISSUE #10 FIX: Accept flow — validates token, checks expiry, adds member
    @Transactional
    public FamilyAccount acceptInvitation(String token, String acceptingUserId, String acceptingUserName, String acceptingUserEmail) {
        long now = System.currentTimeMillis();
        Long lockoutUntil = lockoutMap.get(acceptingUserId);
        if (lockoutUntil != null && now < lockoutUntil) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed attempts. Try again in a few minutes.");
        }

        // Verify signature FIRST before querying Postgres
        verifyTokenSignature(token);

        try {
            FamilyInvitation inv = invitationRepo.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));
            if (inv.getStatus() != FamilyInvitation.InvitationStatus.PENDING) {
                throw new ResponseStatusException(HttpStatus.GONE, "Invitation already used or expired");
            }
            if (Instant.now().isAfter(inv.getExpiresAt())) {
                inv.setStatus(FamilyInvitation.InvitationStatus.EXPIRED);
                invitationRepo.save(inv);
                throw new ResponseStatusException(HttpStatus.GONE, "Invitation has expired");
            }
            // Phase4.0015 FIX: invitation leakage defense-in-depth.
            // Asserts the caller email matches the token's invitee email (case-insensitive).
            if (inv.getInviteeEmail() != null && !inv.getInviteeEmail().equalsIgnoreCase(acceptingUserEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This invitation was intended for a different user");
            }
            FamilyAccount family = repo.findActiveById(inv.getFamilyId())
                .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
            boolean alreadyMember = family.getMembers() != null &&
                family.getMembers().stream().anyMatch(m -> acceptingUserId.equals(m.getUid()));
            if (!alreadyMember) {
                List<FamilyAccount.FamilyMember> members = new java.util.ArrayList<>(
                    family.getMembers() != null ? family.getMembers() : List.of()
                );
                planLimitService.assertCanAddFamilyMember(family.getOwnerId(), members.size());
                members.add(new FamilyAccount.FamilyMember(acceptingUserId, acceptingUserName, "MEMBER"));
                family.setMembers(members);
                repo.save(family);
            }
            inv.setStatus(FamilyInvitation.InvitationStatus.ACCEPTED);
            inv.setAcceptedAt(Instant.now());
            invitationRepo.save(inv);
            
            // Success: reset lockout tracking
            failCountMap.remove(acceptingUserId);
            lockoutMap.remove(acceptingUserId);
            
            return family;
        } catch (ResponseStatusException e) {
            if (e.getStatusCode().is4xxClientError()) {
                int count = failCountMap.merge(acceptingUserId, 1, Integer::sum);
                if (count >= 5) {
                    lockoutMap.put(acceptingUserId, now + (15 * 60 * 1000)); // 15 minute lockout
                    failCountMap.remove(acceptingUserId);
                }
            }
            throw e;
        }
    }

    @Transactional
    public FamilyAccount addMember(String familyId, String requestUserId, String name, String role) {
        FamilyAccount family = repo.findActiveById(familyId)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
        Guards.assertOwner(family.getOwnerId(), requestUserId);
        List<FamilyAccount.FamilyMember> members = new java.util.ArrayList<>(
            family.getMembers() != null ? family.getMembers() : List.of()
        );
        planLimitService.assertCanAddFamilyMember(family.getOwnerId(), members.size());
        String memberUid = "mem-" + UUID.randomUUID().toString().substring(0, 8);
        members.add(new FamilyAccount.FamilyMember(memberUid, name, role != null ? role : "MEMBER"));
        family.setMembers(members);
        return repo.save(family);
    }

    @Transactional
    public FamilyAccount removeMember(String familyId, String requestUserId, String memberUid) {
        FamilyAccount family = repo.findActiveById(familyId)
            .orElseThrow(() -> new com.financetracker.exception.NotFoundException("Family account not found"));
        // Either owner removes, or a member removes themselves
        if (!requestUserId.equals(memberUid)) {
            Guards.assertOwner(family.getOwnerId(), requestUserId);
        }
        if (family.getMembers() != null) {
            List<FamilyAccount.FamilyMember> members = new java.util.ArrayList<>(family.getMembers());
            members.removeIf(m -> memberUid.equals(m.getUid()));
            family.setMembers(members);
            return repo.save(family);
        }
        return family;
    }

    private String signToken(String baseToken) {
        try {
            String key = (jwtSecret == null || jwtSecret.isBlank()) ? "temporary-dev-secret-key-must-change-in-prod" : jwtSecret;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(baseToken.getBytes(StandardCharsets.UTF_8));
            return baseToken + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign invitation token", e);
        }
    }

    private void verifyTokenSignature(String token) {
        if (token == null || !token.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid invitation token format");
        }
        int dot = token.lastIndexOf('.');
        String baseToken = token.substring(0, dot);
        String clientSig = token.substring(dot + 1);
        String expectedToken = signToken(baseToken);
        String expectedSig = expectedToken.substring(expectedToken.lastIndexOf('.') + 1);
        if (!MessageDigest.isEqual(
            clientSig.getBytes(StandardCharsets.UTF_8),
            expectedSig.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid invitation token signature");
        }
    }
}
