package com.financetracker.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.repositories.BankAccountRepository;
import com.financetracker.repositories.BudgetRepository;
import com.financetracker.repositories.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/finance/mcp")
@CrossOrigin(origins = "*")
public class McpController {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BankAccountRepository bankAccountRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter mcpSse() {
        SseEmitter emitter = new SseEmitter(0L); // Infinite timeout
        long clientId = System.currentTimeMillis();
        String messageEndpoint = "/api/finance/mcp/message?clientId=" + clientId;
        
        try {
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data(messageEndpoint));
            emitters.add(emitter);
        } catch (IOException e) {
            emitter.complete();
        }

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));

        return emitter;
    }

    @PostMapping("/message")
    public Map<String, Object> handleMcpMessage(@RequestBody Map<String, Object> body) {
        String method = (String) body.get("method");
        Object params = body.get("params");
        Object id = body.get("id");

        Map<String, Object> result = null;
        Map<String, Object> error = null;

        try {
            if ("tools/list".equals(method)) {
                result = Map.of(
                        "tools", List.of(
                                Map.of("name", "get_transactions", "description", "Get all financial transactions", 
                                       "inputSchema", Map.of("type", "object", "properties", Map.of())),
                                Map.of("name", "get_accounts", "description", "Get all bank accounts and balances", 
                                       "inputSchema", Map.of("type", "object", "properties", Map.of())),
                                Map.of("name", "get_budgets", "description", "Get all budget categories and limits", 
                                       "inputSchema", Map.of("type", "object", "properties", Map.of()))
                        )
                );
            } else if ("tools/call".equals(method)) {
                Map<String, Object> paramsMap = (Map<String, Object>) params;
                String toolName = (String) paramsMap.get("name");
                
                String textData = "";
                if ("get_transactions".equals(toolName)) {
                    textData = objectMapper.writeValueAsString(transactionRepository.findAll());
                } else if ("get_accounts".equals(toolName)) {
                    textData = objectMapper.writeValueAsString(bankAccountRepository.findAll());
                } else if ("get_budgets".equals(toolName)) {
                    textData = objectMapper.writeValueAsString(budgetRepository.findAll());
                } else {
                    error = Map.of("code", -32601, "message", "Tool not found");
                }

                if (error == null) {
                    result = Map.of("content", List.of(Map.of("type", "text", "text", textData)));
                }
            } else {
                error = Map.of("code", -32601, "message", "Method not found");
            }
        } catch (Exception e) {
            error = Map.of("code", -32603, "message", e.getMessage());
        }

        return Map.of("jsonrpc", "2.0", "id", id != null ? id : 0, "result", result != null ? result : Collections.emptyMap(), "error", error != null ? error : Collections.emptyMap());
    }
}
