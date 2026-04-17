package com.financetracker.service;

import com.financetracker.model.UserProfile;
import com.financetracker.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserProfileRepository repo;

    @Transactional(readOnly = true)
    public List<UserProfile> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<UserProfile> findById(String id) {
        return repo.findById(id);
    }

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public Optional<UserProfile> findByEmail(String email) {
        return repo.findByEmail(email);
    }

    @Transactional
    public UserProfile create(UserProfile profile) {
        if (profile.getId() == null || profile.getId().isBlank()) {
            profile.setId("user-" + System.currentTimeMillis());
        }
        return repo.save(profile);
    }

    @SuppressWarnings("null")
    @Transactional
    public UserProfile update(String id, UserProfile updates) {
        UserProfile existing = repo.findById(id).orElseThrow(() -> new RuntimeException("User profile not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getEmail() != null) existing.setEmail(updates.getEmail());
        if (updates.getRole() != null) existing.setRole(updates.getRole());
        if (updates.getAvatar() != null) existing.setAvatar(updates.getAvatar());
        if (updates.getPreferences() != null) existing.setPreferences(updates.getPreferences());
        if (updates.getFamilyId() != null) existing.setFamilyId(updates.getFamilyId());
        return repo.save(existing);
    }

    @Transactional
    public void delete(String id) {
        repo.deleteById(id);
    }
}
