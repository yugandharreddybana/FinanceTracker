package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "app_users", schema = "finance_app")

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {
    @Id
    private String id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String displayName;
}
