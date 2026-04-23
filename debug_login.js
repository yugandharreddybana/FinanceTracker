import { loginUser } from "./server/lib/auth.ts";
try {
  const result = loginUser("test123@test123.com", "password123"); // Assuming this is what the user tried
  console.log("Login successful:", result.user.email);
} catch (err) {
  console.error("Login failed with error:", err.message);
  console.error(err.stack);
}
