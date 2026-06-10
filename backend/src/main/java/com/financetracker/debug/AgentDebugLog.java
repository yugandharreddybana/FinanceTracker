package com.financetracker.debug;

import java.io.IOException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class AgentDebugLog {
    private static final Logger LOG = LoggerFactory.getLogger(AgentDebugLog.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private AgentDebugLog() {}

    public static void log(String hypothesisId, String location, String message, Map<String, ?> data) {
        String enabled = System.getenv("FINANCE_TRACKER_AGENT_DEBUG");
        if (!"true".equalsIgnoreCase(enabled)) {
            return;
        }
        try {
            String envFile = System.getenv("FINANCE_TRACKER_DEBUG_LOG");
            if (envFile == null || envFile.isBlank()) {
                return;
            }
            Path p = Path.of(envFile).toAbsolutePath().normalize();
            // Phase4.005: Gate behind strict pre-existence check so the debug
            // flag cannot be used as an arbitrary file write primitive.
            if (!Files.exists(p)) {
                return;
            }
            if (Files.size(p) > 10_000_000L) {
                return; // Guard against unbounded disk consumption
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sessionId", "5c48c3");
            payload.put("hypothesisId", hypothesisId);
            payload.put("location", location);
            payload.put("message", message);
            payload.put("data", data);
            payload.put("timestamp", System.currentTimeMillis());
            String line = MAPPER.writeValueAsString(payload) + "\n";
            Files.writeString(p, line, StandardOpenOption.APPEND);
        } catch (Exception ex) {
            LOG.warn("[agent-debug] append debug log failed: {}", ex.toString());
        }
    }
}
