/** Cookie that remembers where a signed-out visitor was headed, for after sign-in. */
export const NEXT_COOKIE = "ih_next";

/**
 * Same-site path to return to, or null. Only plain app paths pass: no scheme,
 * no protocol-relative `//host`, no backslash tricks, no auth/login loops.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512 || !raw.startsWith("/") || /[\\\x00-\x1f]/.test(raw)) return null;
  const url = new URL(raw, "http://x");
  if (url.host !== "x" || /^\/(login|auth|api|setup)(\/|$)/.test(url.pathname)) return null;
  return url.pathname + url.search;
}
