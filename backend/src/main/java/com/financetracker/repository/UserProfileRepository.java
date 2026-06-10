package com.financetracker.repository;

import com.financetracker.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
    Optional<UserProfile> findByEmail(String email);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM UserProfile p WHERE p.timezone IN :timezones OR (:includeNull = true AND (p.timezone IS NULL OR p.timezone = ''))")
    List<UserProfile> findByTimezoneInOrNull(
        @org.springframework.data.repository.query.Param("timezones") java.util.Collection<String> timezones, 
        @org.springframework.data.repository.query.Param("includeNull") boolean includeNull);
}
