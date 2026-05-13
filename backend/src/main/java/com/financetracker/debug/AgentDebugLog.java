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
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sessionId", "5c48c3");
            payload.put("hypothesisId", hypothesisId);
            payload.put("location", location);
            payload.put("message", message);
            payload.put("data", data);
            payload.put("timestamp", System.currentTimeMillis());
            String line = MAPPER.writeValueAsString(payload);
            String envFile = System.getenv("FINANCE_TRACKER_DEBUG_LOG");
            IOException last = null;
            if (envFile != null && !envFile.isBlank()) {
                try {
                    Files.writeString(Path.of(envFile), line + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                    return;
                } catch (IOException e) {
                    last = e;
                }
            }
            Path start = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
            Path cur = start;
            for (int depth = 0; depth < 12 && cur != null; depth++) {
                Path p = cur.resolve("debug-5c48c3.log");
                try {
                    Files.writeString(p, line + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                    return;
                } catch (IOException e) {
                    last = e;
                }
                cur = cur.getParent();
            }
            if (last != null) {
                throw last;
            }
        } catch (Exception ex) {
            LOG.warn("[agent-debug] append debug-5c48c3 failed: {}", ex.toString());
        }
    }
}
