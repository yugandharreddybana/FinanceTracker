package com.financetracker.config.seeder;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class CurrencySeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(CurrencySeeder.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        logger.info("Initializing currency data...");
        
        try {
            // Create table if it doesn't exist (H2/Postgres compatible)
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS finance_app.currencies (" +
                    "code VARCHAR(3) PRIMARY KEY, " +
                    "name VARCHAR(50), " +
                    "symbol VARCHAR(5), " +
                    "exchange_rate DECIMAL(19,4)" +
                    ")");

            // Check if it's H2 or Postgres to use correct UPSERT syntax
            if (jdbcTemplate.getDataSource() == null) {
                logger.error("DataSource is null, cannot seed currency data");
                return;
            }
            java.sql.Connection conn = jdbcTemplate.getDataSource().getConnection();
            if (conn == null) {
                logger.error("Connection is null, cannot seed currency data");
                return;
            }
            String databaseProductName = conn.getMetaData().getDatabaseProductName();
            logger.info("Detected database: {}", databaseProductName);

            if (databaseProductName.equalsIgnoreCase("H2")) {
                // H2 MERGE syntax
                logger.info("Using H2 MERGE syntax for seeding");
                jdbcTemplate.execute("MERGE INTO finance_app.currencies KEY(code) VALUES ('INR', 'Indian Rupee', '₹', 1.0)");
                jdbcTemplate.execute("MERGE INTO finance_app.currencies KEY(code) VALUES ('USD', 'US Dollar', '$', 0.012)");
                jdbcTemplate.execute("MERGE INTO finance_app.currencies KEY(code) VALUES ('EUR', 'Euro', '€', 0.011)");
                jdbcTemplate.execute("MERGE INTO finance_app.currencies KEY(code) VALUES ('GBP', 'British Pound', '£', 0.0094)");
            } else {
                // Postgres ON CONFLICT syntax
                logger.info("Using Postgres ON CONFLICT syntax for seeding");
                jdbcTemplate.execute("INSERT INTO finance_app.currencies (code, name, symbol, exchange_rate) " +
                        "VALUES ('INR', 'Indian Rupee', '₹', 1.0) ON CONFLICT (code) DO NOTHING");
                jdbcTemplate.execute("INSERT INTO finance_app.currencies (code, name, symbol, exchange_rate) " +
                        "VALUES ('USD', 'US Dollar', '$', 0.012) ON CONFLICT (code) DO NOTHING");
                jdbcTemplate.execute("INSERT INTO finance_app.currencies (code, name, symbol, exchange_rate) " +
                        "VALUES ('EUR', 'Euro', '€', 0.011) ON CONFLICT (code) DO NOTHING");
                jdbcTemplate.execute("INSERT INTO finance_app.currencies (code, name, symbol, exchange_rate) " +
                        "VALUES ('GBP', 'British Pound', '£', 0.0094) ON CONFLICT (code) DO NOTHING");
            }
            
            logger.info("Currency seeding completed successfully.");
        } catch (Exception e) {
            logger.error("Error during currency seeding: {}", e.getMessage());
            // Don't rethrow to avoid blocking application startup if seeding fails
        }
    }
}
