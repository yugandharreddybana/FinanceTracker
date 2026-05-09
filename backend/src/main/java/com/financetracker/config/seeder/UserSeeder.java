package com.financetracker.config.seeder;

import com.financetracker.model.UserProfile;
import com.financetracker.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class UserSeeder implements CommandLineRunner {

    private final UserProfileService userService;

    @Override
    public void run(String... args) {
        log.info("Checking for default user...");
        
        String defaultEmail = "yugi@finance.com";
        if (userService.findByEmail(defaultEmail).isEmpty()) {
            log.info("Creating default developer user...");
            UserProfile user = new UserProfile();
            user.setId("user-dev-001");
            user.setName("Yugi");
            user.setEmail(defaultEmail);
            user.setRole("ADMIN");
            user.setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=Yugi");
            
            userService.create(user);
            log.info("Default user created successfully.");
        } else {
            log.info("Default user already exists.");
        }
    }
}
