import { describe, it, expect } from "vitest";
import { authenticate, registerUser, AuthError } from "@/services/api/auth-api";

describe("authenticate", () => {
  it("signs in the demo customer", async () => {
    const s = await authenticate("customer@shopsphere.dev", "Customer@123");
    expect(s.user).toMatchObject({ role: "customer", email: "customer@shopsphere.dev" });
    expect(s.token).toMatch(/^mock\./);
    expect(s.expiresAt).toBeGreaterThan(Date.now());
    expect(s.user).not.toHaveProperty("passwordHash");
  });
  it("signs in the demo admin with an admin role", async () => {
    expect((await authenticate("ADMIN@shopsphere.dev", "Admin@1234")).user.role).toBe("admin");
  });
  it("rejects wrong passwords and unknown users with the same message", async () => {
    const a = await authenticate("customer@shopsphere.dev", "wrong").catch((e) => e);
    const b = await authenticate("nobody@x.com", "whatever1").catch((e) => e);
    expect(a).toBeInstanceOf(AuthError);
    expect(a.message).toBe(b.message);
  });
  it("rejects empty input", async () => {
    await expect(authenticate("", "")).rejects.toBeInstanceOf(AuthError);
  });
});

describe("registerUser", () => {
  const good = { name: "Asha Rao", email: "asha@example.com", phone: "98765 43210", password: "password1" };
  it("creates a customer and stores only a password hash", async () => {
    const { record, session } = await registerUser(good);
    expect(record.role).toBe("customer");
    expect(record.phone).toBe("9876543210");
    expect(record.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(record)).not.toContain("password1");
    expect(session.user.email).toBe("asha@example.com");
  });
  it("allows the registered user to sign in afterwards", async () => {
    const { record } = await registerUser(good);
    const s = await authenticate("asha@example.com", "password1", [record]);
    expect(s.user.name).toBe("Asha Rao");
  });
  it("rejects duplicates of demo and registered emails", async () => {
    await expect(registerUser({ ...good, email: "admin@shopsphere.dev" })).rejects.toMatchObject({ field: "email" });
    const { record } = await registerUser(good);
    await expect(registerUser(good, [record])).rejects.toMatchObject({ field: "email" });
  });
  it("reports the invalid field", async () => {
    await expect(registerUser({ ...good, name: "A" })).rejects.toMatchObject({ field: "name" });
    await expect(registerUser({ ...good, email: "bad" })).rejects.toMatchObject({ field: "email" });
    await expect(registerUser({ ...good, phone: "123" })).rejects.toMatchObject({ field: "phone" });
    await expect(registerUser({ ...good, password: "short" })).rejects.toMatchObject({ field: "password" });
  });
});
