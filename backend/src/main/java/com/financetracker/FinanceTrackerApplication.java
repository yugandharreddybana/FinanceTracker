package com.financetracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class FinanceTrackerApplication {
    public static void main(String[] args) {
        loadEnv();
        SpringApplication.run(FinanceTrackerApplication.class, args);
    }

    private static void loadEnv() {
        try {
            // Check for .env in current dir or parent dir (root)
            Path envPath = Paths.get(".env");
            if (!Files.exists(envPath)) {
                envPath = Paths.get("..", ".env");
            }

            if (Files.exists(envPath)) {
                System.out.println("Loading environment variables from: " + envPath.toAbsolutePath());
                Files.readAllLines(envPath).forEach(line -> {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) return;
                    
                    int sep = line.indexOf('=');
                    if (sep > 0) {
                        String key = line.substring(0, sep).trim();
                        String value = line.substring(sep + 1).trim();
                        // Remove quotes if present
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        } else if (value.startsWith("'") && value.endsWith("'")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        System.setProperty(key, value);
                    }
                });
            }
        } catch (IOException e) {
            System.err.println("Failed to load .env file: " + e.getMessage());
        }
    }
}
