package com.financetracker.util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.HexFormat;
import java.nio.charset.StandardCharsets;

public class PasswordUtils {

    private PasswordUtils() {}

    /**
     * Computes a PBKDF2 HMAC SHA-512 hash of the password.
     * Aligned with Node's crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512")
     */
    public static String hashPassword(String password, String salt, int iterations) {
        try {
            // Length in bits: 64 bytes * 8 = 512 bits
            KeySpec spec = new PBEKeySpec(password.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), iterations, 512);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] hash = factory.generateSecret(spec).getEncoded();
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Cryptographic subsystem failure", e);
        }
    }

    /**
     * Performs a timing-safe comparison of two hash strings.
     */
    public static boolean verifyPassword(String password, String salt, int iterations, String storedHash) {
        if (storedHash == null || salt == null) {
            return false;
        }
        String computedHash = hashPassword(password, salt, iterations);
        
        byte[] computedBytes = computedHash.getBytes(StandardCharsets.UTF_8);
        byte[] storedBytes = storedHash.getBytes(StandardCharsets.UTF_8);
        
        return MessageDigest.isEqual(computedBytes, storedBytes);
    }
}
