import type { Role } from "@prisma/client";

/** Full administrator — unrestricted access. */
export const isAdmin      = (role: Role): boolean => role === "ADMIN";

/** Staff member (ADMIN or MODERATOR) — can access the panel. */
export const isStaff      = (role: Role): boolean => role === "ADMIN" || role === "MODERATOR";

/** Only admins may perform destructive or privileged operations. */
export const canDelete    = (role: Role): boolean => role === "ADMIN";
export const canViewAudit = (role: Role): boolean => role === "ADMIN";
export const canManageTeam = (role: Role): boolean => role === "ADMIN";
