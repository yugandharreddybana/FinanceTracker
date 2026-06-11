package com.financetracker.model;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiUsageMonthlyId implements Serializable {
    private String userId;
    private String yearMonth;
}
