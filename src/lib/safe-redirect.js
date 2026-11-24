/**
 * Only allow same-site relative paths as post-login redirect targets (prevents open redirects).
 * @param {unknown} target
 * @param {string} [fallback]
 */
export function safeRedirect(target, fallback = "/") {
  if (typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  if (target.startsWith("/login") || target.startsWith("/register")) return fallback;
  return target;
}
