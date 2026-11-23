import type { Role } from "@prisma/client";

/** Super administrator — everything an admin can do, plus managing admins. */
export const isSuperAdmin = (role: Role): boolean => role === "SUPERADMIN";

/** Full administrator (ADMIN or SUPERADMIN) — unrestricted access to the panel. */
export const isAdmin      = (role: Role): boolean => role === "ADMIN" || role === "SUPERADMIN";

/** Staff member (SUPERADMIN, ADMIN or MODERATOR) — can access the panel. */
export const isStaff      = (role: Role): boolean => isAdmin(role) || role === "MODERATOR";

/** Only admins may perform destructive or privileged operations. */
export const canDelete    = (role: Role): boolean => isAdmin(role);
export const canViewAudit = (role: Role): boolean => isAdmin(role);
export const canManageTeam = (role: Role): boolean => isAdmin(role);

/** Only the super admin may grant or revoke the ADMIN role. */
export const canManageAdmins = (role: Role): boolean => isSuperAdmin(role);
