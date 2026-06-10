package com.financetracker.scheduler;

import com.financetracker.model.Investment;
import com.financetracker.repository.InvestmentRepository;
import com.financetracker.service.InvestmentService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Arrays;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * ISSUE #4 FIX: Daily market price refresh for all investment holdings.
 * Runs at 21:00 UTC (after US market close at ~20:00 UTC).
 * Uses Alpha Vantage API (free tier: 25 requests/day).
 * currentPrice is NEVER writable by clients — only updated here.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InvestmentPriceRefreshScheduler {
    private final InvestmentRepository investmentRepo;
    private final InvestmentService investmentService;
    private final ObjectMapper objectMapper;
    private final Environment env;

    @Value("${ALPHA_VANTAGE_API_KEY:#{null}}")
    private String apiKey;

    @PostConstruct
    public void validateApiKey() {
        List<String> activeProfiles = Arrays.asList(env.getActiveProfiles());
        boolean isProd = activeProfiles.contains("prod") || activeProfiles.contains("production");
        if (isProd) {
            if (apiKey == null || apiKey.isBlank() || "demo".equalsIgnoreCase(apiKey)) {
                throw new IllegalStateException(
                    "CRITICAL CONFIG ERROR: ALPHA_VANTAGE_API_KEY must be configured in production. Cannot fall back to 'demo' as it silently defaults to IBM quotes."
                );
            }
        }
    }

    private static final String AV_URL =
        "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=%s&apikey=%s";

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(10))
        .build();

    private static final java.util.regex.Pattern SYMBOL_PATTERN = 
        java.util.regex.Pattern.compile("^[A-Z0-9.\\-]{1,12}$");

    @Scheduled(cron = "0 0 21 * * MON-FRI", zone = "UTC")
    public void refreshPrices() {
        if (apiKey == null || apiKey.isBlank() || "demo".equalsIgnoreCase(apiKey)) {
            log.warn("[InvestmentPriceRefreshScheduler] ALPHA_VANTAGE_API_KEY not configured (got '{}') — skipping refresh",
                apiKey);
            return;
        }
        List<Investment> all = investmentRepo.findAll();
        List<String> symbols = all.stream()
            .map(Investment::getSymbol)
            .filter(s -> s != null && !s.isBlank())
            .filter(s -> SYMBOL_PATTERN.matcher(s.toUpperCase()).matches()) // SSRF protection
            .distinct()
            .toList();
        if (symbols.isEmpty()) return;
        log.info("[InvestmentPriceRefreshScheduler] Refreshing {} symbols", symbols.size());
        
        for (String symbol : symbols) {
            try {
                String encodedSymbol = java.net.URLEncoder.encode(symbol, java.nio.charset.StandardCharsets.UTF_8);
                String url = String.format(AV_URL, encodedSymbol, apiKey);
                HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
                
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode quote = root.path("Global Quote");
                String priceStr = quote.path("05. price").asText(null);
                
                if (priceStr != null && !priceStr.isBlank()) {
                    BigDecimal price = new BigDecimal(priceStr);
                    
                    // Phase4.025 Assertion: Confirm all positions possessed an assigned currency
                    List<Investment> positions = investmentRepo.findAllBySymbol(symbol);
                    for (Investment pos : positions) {
                        if (pos.getCurrency() == null || pos.getCurrency().isBlank()) {
                            log.error("Holding {} has unassigned currency; skipping price update for {}", pos.getId(), symbol);
                            continue;
                        }
                    }
                    
                    investmentService.updatePricesFromMarket(symbol, price);
                    log.info("[InvestmentPriceRefreshScheduler] {} → {}", symbol, price);
                }
            } catch (Exception e) {
                log.error("[InvestmentPriceRefreshScheduler] Failed for {}: {}", symbol, e.getMessage());
            }
        }
    }
}
