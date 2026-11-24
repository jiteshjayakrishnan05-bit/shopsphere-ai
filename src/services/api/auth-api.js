import demoUsers from "@/data/demo-users.json";
import { SESSION_TTL_MS } from "@/lib/constants";
import { hashPassword } from "@/lib/password";
import { isValidEmail, isValidPassword, isValidPhone } from "@/lib/validators";

/** Authentication failure with a user-safe message and optional field. */
export class AuthError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "AuthError";
    this.field = field;
  }
}

const sameEmail = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const findUser = (email, registered) => [...demoUsers, ...registered].find((u) => sameEmail(u.email, email));

/**
 * Token-like session object. Shaped so a real auth provider (JWT/OAuth) can replace the mock later.
 * NOT production security: everything runs in the browser.
 */
function buildSession(user) {
  return {
    token: `mock.${crypto.randomUUID()}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? "", role: user.role },
  };
}

/** @returns {Promise<import("@/store/auth-store").Session>} */
export async function authenticate(email, password, registeredUsers = []) {
  if (!isValidEmail(email) || !password) throw new AuthError("Enter your email and password.");
  const user = findUser(email, registeredUsers);
  const hash = await hashPassword(email, password);
  // One generic message for unknown email and wrong password.
  if (!user || user.passwordHash !== hash) throw new AuthError("Incorrect email or password.");
  return buildSession(user);
}

/** Validate and create a customer account. Returns the record to persist plus a signed-in session. */
export async function registerUser({ name, email, phone, password }, registeredUsers = []) {
  if (String(name ?? "").trim().length < 2) throw new AuthError("Enter your full name.", "name");
  if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.", "email");
  if (!isValidPhone(phone)) throw new AuthError("Enter a valid 10-digit mobile number.", "phone");
  if (!isValidPassword(password)) throw new AuthError("Use at least 8 characters.", "password");
  if (findUser(email, registeredUsers)) throw new AuthError("An account with this email already exists.", "email");

  const record = {
    id: `u_${crypto.randomUUID()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: String(phone).replace(/[\s-]/g, ""),
    role: "customer", // self-registration can never create an admin
    passwordHash: await hashPassword(email, password),
  };
  return { record, session: buildSession(record) };
}
