package com.financetracker.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class BulkUpdateRequest {
    @NotEmpty
    @Size(max = 500)
    private List<String> ids;

    @NotNull
    private Map<String, Object> updates;
}
