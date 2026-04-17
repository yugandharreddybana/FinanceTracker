package com.financetracker.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class BulkUpdateRequest {
    private List<String> ids;
    private Map<String, Object> updates;
}
