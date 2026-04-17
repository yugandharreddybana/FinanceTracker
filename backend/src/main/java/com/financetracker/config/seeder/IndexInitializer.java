package com.financetracker.config.seeder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Creates performance indexes after Hibernate DDL has finished creating/updating tables.
 * Runs at Order(1) so it executes before the data seeders (Order(2)+).
 * Each index is created independently so one failure does not block others.
 */
@Configuration
public class IndexInitializer {

    private static final Logger logger = LoggerFactory.getLogger(IndexInitializer.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Bean
    @Order(1)
    public ApplicationRunner createIndexes() {
        return args -> {
            logger.info("Creating performance indexes...");
            createIndex("idx_transactions_date",    "CREATE INDEX IF NOT EXISTS idx_transactions_date    ON finance_app.transactions(date)");
            createIndex("idx_transactions_category","CREATE INDEX IF NOT EXISTS idx_transactions_category ON finance_app.transactions(category)");
            createIndex("idx_transactions_type",    "CREATE INDEX IF NOT EXISTS idx_transactions_type    ON finance_app.transactions(type)");
            createIndex("idx_transactions_account", "CREATE INDEX IF NOT EXISTS idx_transactions_account  ON finance_app.transactions(account)");
            createIndex("idx_budgets_category",     "CREATE INDEX IF NOT EXISTS idx_budgets_category     ON finance_app.budgets(category)");
            createIndex("idx_audit_logs_entity",    "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity    ON finance_app.audit_logs(entity_type, entity_id)");
            createIndex("idx_audit_logs_timestamp", "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON finance_app.audit_logs(timestamp)");
            createIndex("idx_user_profiles_email",  "CREATE INDEX IF NOT EXISTS idx_user_profiles_email  ON finance_app.user_profiles(email)");
            logger.info("Performance indexes ready.");
        };
    }

    private void createIndex(String name, String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            // Index creation is best-effort; log and continue so startup is never blocked
            logger.warn("Could not create index {}: {}", name, e.getMessage());
        }
    }
}
