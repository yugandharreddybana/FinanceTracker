package com.financetracker.scheduler;

import com.financetracker.model.Investment;
import com.financetracker.repository.InvestmentRepository;
import com.financetracker.service.InvestmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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

    @Value("${ALPHA_VANTAGE_API_KEY:demo}")
    private String apiKey;

    private static final String AV_URL =
        "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=%s&apikey=%s";

    @Scheduled(cron = "0 0 21 * * MON-FRI", zone = "UTC")
    public void refreshPrices() {
        List<Investment> all = investmentRepo.findAll();
        List<String> symbols = all.stream()
            .map(Investment::getSymbol)
            .filter(s -> s != null && !s.isBlank())
            .distinct()
            .toList();
        if (symbols.isEmpty()) return;
        log.info("[InvestmentPriceRefreshScheduler] Refreshing {} symbols", symbols.size());
        HttpClient client = HttpClient.newHttpClient();
        for (String symbol : symbols) {
            try {
                String url = String.format(AV_URL, symbol, apiKey);
                HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url)).build();
                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode quote = root.path("Global Quote");
                String priceStr = quote.path("05. price").asText(null);
                if (priceStr != null && !priceStr.isBlank()) {
                    BigDecimal price = new BigDecimal(priceStr);
                    investmentService.updatePricesFromMarket(symbol, price);
                    log.info("[InvestmentPriceRefreshScheduler] {} → {}", symbol, price);
                }
            } catch (Exception e) {
                log.error("[InvestmentPriceRefreshScheduler] Failed for {}: {}", symbol, e.getMessage());
            }
        }
    }
}
