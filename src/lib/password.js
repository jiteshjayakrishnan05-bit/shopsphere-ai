/**
 * Hash a password with SHA-256 (salted with the email) so plain passwords are never stored in localStorage.
 * DEMO ONLY: a real app hashes server-side with a slow algorithm (bcrypt/argon2).
 */
export async function hashPassword(email, password) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Secure hashing is unavailable in this browser context.");
  const data = new TextEncoder().encode(`shopsphere:${String(email).trim().toLowerCase()}:${password}`);
  const digest = await subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
