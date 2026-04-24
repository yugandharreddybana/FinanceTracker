package com.financetracker.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

@Data
@Entity
@Table(name = "user_profiles", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfile {
    @Id
    private String id;

    private String name;
    private String email;
    private String role;

    @Column(columnDefinition = "text")
    private String avatar;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> preferences;

    private String familyId;
}
