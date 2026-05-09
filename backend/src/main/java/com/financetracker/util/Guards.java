package com.financetracker.util;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Guards {
    private Guards() {}

    public static String requireUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
        }
        return userId;
    }

    public static void assertOwner(String entityUserId, String requestUserId) {
        requireUser(requestUserId);
        if (entityUserId == null || !entityUserId.equals(requestUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }
}
