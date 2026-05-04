package com.financetracker.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class BulkDeleteRequest {
    @NotEmpty
    @Size(max = 500)
    private List<String> ids;
}
