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

@Service
@RequiredArgsConstructor
public class FamilyAccountService {
    private final FamilyAccountRepository repo;
    private final FamilyInvitationRepository invitationRepo;

    // ISSUE #11 FIX: Queries families where user is owner OR a member
    @Transactional(readOnly = true)
    public List<FamilyAccount> findAllForUser(String userId) {
        return repo.findAllByOwnerOrMember(userId);
    }

    @Transactional(readOnly = true)
    public Optional<FamilyAccount> findByIdForUser(String id, String userId) {
        return repo.findById(id).filter(f -> isOwnerOrMember(f, userId));
    }

    private boolean isOwnerOrMember(FamilyAccount f, String userId) {
        if (userId == null) return false;
        if (userId.equals(f.getOwnerId())) return true;
        return f.getMembers() != null &&
            f.getMembers().stream().anyMatch(m -> userId.equals(m.getUid()));
    }

    @Transactional
    public FamilyAccount create(FamilyAccount family) {
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
        FamilyAccount existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Family account not found"));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getSharedBudgets() != null) existing.setSharedBudgets(updates.getSharedBudgets());
        if (updates.getSharedAccounts() != null) existing.setSharedAccounts(updates.getSharedAccounts());
        // ISSUE #10 FIX: members list is NEVER overwritten from client input here
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id, String requestUserId) {
        FamilyAccount existing = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Family account not found"));
        Guards.assertOwner(existing.getOwnerId(), requestUserId);
        // ISSUE #22 FIX: Soft-delete
        existing.setDeleted(true);
        existing.setDeletedAt(Instant.now());
        repo.save(existing);
    }

    // ISSUE #10 FIX: Invitation flow — owner sends invite, invitee must accept
    @Transactional
    public FamilyInvitation inviteMember(String familyId, String inviterId, String inviteeEmail) {
        FamilyAccount family = repo.findById(familyId)
            .orElseThrow(() -> new RuntimeException("Family account not found"));
        Guards.assertOwner(family.getOwnerId(), inviterId);
        FamilyInvitation inv = FamilyInvitation.builder()
            .id(UUID.randomUUID().toString())
            .familyId(familyId)
            .inviterId(inviterId)
            .inviteeEmail(inviteeEmail)
            .token(UUID.randomUUID().toString())
            .status(FamilyInvitation.InvitationStatus.PENDING)
            .createdAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(72 * 3600))
            .build();
        return invitationRepo.save(inv);
    }

    // ISSUE #10 FIX: Accept flow — validates token, checks expiry, adds member
    @Transactional
    public FamilyAccount acceptInvitation(String token, String acceptingUserId, String acceptingUserName) {
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
        FamilyAccount family = repo.findById(inv.getFamilyId())
            .orElseThrow(() -> new RuntimeException("Family account not found"));
        boolean alreadyMember = family.getMembers() != null &&
            family.getMembers().stream().anyMatch(m -> acceptingUserId.equals(m.getUid()));
        if (!alreadyMember) {
            List<FamilyAccount.FamilyMember> members = new java.util.ArrayList<>(
                family.getMembers() != null ? family.getMembers() : List.of()
            );
            members.add(new FamilyAccount.FamilyMember(acceptingUserId, acceptingUserName, "MEMBER"));
            family.setMembers(members);
            repo.save(family);
        }
        inv.setStatus(FamilyInvitation.InvitationStatus.ACCEPTED);
        inv.setAcceptedAt(Instant.now());
        invitationRepo.save(inv);
        return family;
    }
}
