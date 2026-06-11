package com.financetracker.exception;

import lombok.Getter;
import java.time.Instant;

@Getter
public class AiQuotaExceededException extends RuntimeException {
    private final int used;
    private final int limit;
    private final Instant resetsAt;

    public AiQuotaExceededException(int used, int limit, Instant resetsAt) {
        super("AI monthly quota exceeded");
        this.used = used;
        this.limit = limit;
        this.resetsAt = resetsAt;
    }
}
