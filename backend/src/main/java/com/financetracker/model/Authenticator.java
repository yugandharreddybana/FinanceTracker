package com.financetracker.model;

import jakarta.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "authenticators")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Authenticator {
    @Id
    @Column(length = 255)
    private String credentialId;

    @Column(name = "user_id")
    private String userId;

    @Column(columnDefinition = "text")
    private String publicKey;

    private Long signCount;
    
    private String transports;
}
