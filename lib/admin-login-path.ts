/**
 * Public URL of the staff login page.
 *
 * Set ADMIN_LOGIN_PATH (e.g. "/some-unguessable-slug/login") to hide the login
 * page: middleware then serves it only at that path and answers /admin/login —
 * and signed-out visits to any /admin page — with a 404, so the panel's
 * location is never revealed. Keep the value out of the repository.
 * Unset, the login stays at /admin/login.
 *
 * No server-only imports: used by middleware and Server Components.
 */

export const INTERNAL_ADMIN_LOGIN_PATH = "/admin/login";

export function adminLoginPath(): string {
  const raw = process.env.ADMIN_LOGIN_PATH?.trim();
  if (!raw) return INTERNAL_ADMIN_LOGIN_PATH;
  const path = "/" + raw.replace(/^\/+|\/+$/g, "");
  // Ignore unusable values rather than locking staff out.
  if (path === "/" || path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next")) {
    return INTERNAL_ADMIN_LOGIN_PATH;
  }
  return path;
}

export function isAdminLoginHidden(): boolean {
  return adminLoginPath() !== INTERNAL_ADMIN_LOGIN_PATH;
}
