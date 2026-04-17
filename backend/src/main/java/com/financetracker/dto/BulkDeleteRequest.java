package com.financetracker.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkDeleteRequest {
    private List<String> ids;
}
