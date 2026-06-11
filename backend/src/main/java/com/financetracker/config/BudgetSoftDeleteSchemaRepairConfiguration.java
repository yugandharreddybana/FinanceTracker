package com.financetracker.config;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfigureBefore;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Hibernate ddl-auto=update adds NOT NULL columns in one step, which fails on H2 when
 * budgets already has rows. Repair nullable-safe before JPA schema migration runs.
 */
@Slf4j
@Configuration
@AutoConfigureBefore(HibernateJpaAutoConfiguration.class)
public class BudgetSoftDeleteSchemaRepairConfiguration {

    @Bean
    Object repairBudgetSoftDeleteColumns(DataSource dataSource) throws SQLException {
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            st.execute("ALTER TABLE finance_app.budgets ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE");
            st.execute("UPDATE finance_app.budgets SET deleted = FALSE WHERE deleted IS NULL");
            try {
                st.execute("ALTER TABLE finance_app.budgets ALTER COLUMN deleted SET NOT NULL");
            } catch (SQLException ignored) {
                // already NOT NULL
            }
            st.execute("ALTER TABLE finance_app.budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP");
        } catch (SQLException e) {
            log.warn("[schema-repair] budget soft-delete columns skipped: {}", e.getMessage());
        }
        log.info("[schema-repair] budget soft-delete columns verified");
        return new Object();
    }
}
