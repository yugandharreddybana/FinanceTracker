package com.financetracker.config;

import jakarta.annotation.PostConstruct;
import java.util.Locale;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class HibernateSchemaGuard {

    private static final Set<String> FORBIDDEN_FOR_POSTGRES = Set.of(
        "update",
        "create",
        "create-drop"
    );

    private final Environment environment;

    public HibernateSchemaGuard(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void forbidDangerousHibernateDdlAgainstPostgres() {
        String url = environment.getProperty("spring.datasource.url", "");
        boolean h2Like = detectH2(url);
        if (h2Like) {
            return;
        }

        String raw = environment.getProperty(
            "spring.jpa.hibernate.ddl-auto",
            "validate"
        );
        String ddl = raw.trim().toLowerCase(Locale.ROOT);

        if (FORBIDDEN_FOR_POSTGRES.contains(ddl)) {
            throw new IllegalStateException(
                "Refusing startup: PostgreSQL (+ non-H2 JDBC) with spring.jpa.hibernate.ddl-auto=\""
                    + ddl
                    + "\" would mutate schema at runtime. Pin DDL_AUTO=validate and change schema via Flyway (db/migration/).");
        }
    }

    private static boolean detectH2(String url) {
        if (url.isBlank()) {
            return false;
        }
        String u = url.toLowerCase(Locale.ROOT);
        return u.startsWith("jdbc:h2:");
    }

}
