import { createToken, verifyToken } from "./lib/auth.js";
import { getServerKeyPair } from "./lib/keyManager.js";

async function test() {
  try {
    console.log("Initializing server key pair...");
    const kp = getServerKeyPair();
    console.log("Public key exported successfully.");

    const payload = {
      uid: "test-uid-123",
      email: "test@example.com",
      name: "Test User"
    };

    console.log("Creating token...");
    const token = createToken(payload);
    console.log("Token created:", token.substring(0, 20) + "...");

    console.log("Verifying token immediately...");
    const result = verifyToken(token);

    if (result) {
      console.log("SUCCESS! Verified user:", result.email);
    } else {
      console.error("FAILED! verifyToken returned null.");
    }

  } catch (err) {
    console.error("Unexpected Error in test harness:", err);
  }
}

test();
