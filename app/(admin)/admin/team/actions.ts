"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt, hashForLookup } from "@/lib/encryption";
import { createStaffAccountAs, type CreateStaffResult } from "@/lib/staff";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { isAdmin, canManageAdmins } from "@/lib/roles";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await validateSession(token);
  if (!session || !isAdmin(session.user.role)) return null;
  return session;
}

export interface TeamMemberRow {
  id:        string;
  name:      string;
  email:     string;
  role:      "MODERATOR" | "ADMIN";
  createdAt: string;
}

export type GetTeamResult =
  | { success: true;  rows: TeamMemberRow[] }
  | { success: false; error: string };

export type PromoteResult =
  | { success: true }
  | { success: false; error: string };

export type RevokeResult =
  | { success: true }
  | { success: false; error: string };

export type { CreateStaffResult } from "@/lib/staff";

// ─── createStaffAccount ───────────────────────────────────────────────────────
// formData: name, email, password, role ("MODERATOR" | "ADMIN"). Logic lives in lib/staff.ts.

export async function createStaffAccount(formData: FormData): Promise<CreateStaffResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };
  return createStaffAccountAs(session.user, {
    name:     formData.get("name") ?? "",
    email:    formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    role:     formData.get("role") ?? "MODERATOR",
  });
}

// ─── getTeam ──────────────────────────────────────────────────────────────────
// Admins see moderators; the super admin sees moderators and admins.

export async function getTeam(): Promise<GetTeamResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const roles: ("MODERATOR" | "ADMIN")[] = canManageAdmins(session.user.role)
    ? ["ADMIN", "MODERATOR"]
    : ["MODERATOR"];

  try {
    const rows = await db.user.findMany({
      where: { role: { in: roles } },
      select: {
        id: true,
        name: true,
        role: true,
        encryptedEmail: true,
        emailIV: true,
        emailTag: true,
        createdAt: true,
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    });

    return {
      success: true,
      rows: rows.map((r) => {
        let email = "[encrypted]";
        try { email = decrypt(r.encryptedEmail, r.emailIV, r.emailTag); } catch { /* keep fallback */ }
        return {
          id: r.id,
          name: r.name,
          email,
          role: r.role as "MODERATOR" | "ADMIN",
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch {
    return { success: false, error: "Failed to load team." };
  }
}

// ─── promoteMember ────────────────────────────────────────────────────────────
// formData: email, role ("MODERATOR" | "ADMIN"). Granting ADMIN requires SUPERADMIN.

export async function promoteMember(formData: FormData): Promise<PromoteResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) return { success: false, error: "Email is required." };

  const targetRole = formData.get("role") === "ADMIN" ? "ADMIN" : "MODERATOR";
  const isSuper = canManageAdmins(session.user.role);
  if (targetRole === "ADMIN" && !isSuper) {
    return { success: false, error: "Only the super admin can grant admin access." };
  }

  try {
    const user = await db.user.findUnique({
      where: { emailHash: hashForLookup(email) },
      select: { id: true, role: true, name: true },
    });

    if (!user) return { success: false, error: "No account found with that email." };
    if (user.id === session.user.id) return { success: false, error: "You cannot change your own role." };
    if (user.role === "SUPERADMIN") return { success: false, error: "Cannot change the super admin's role." };
    if (user.role === "ADMIN" && !isSuper) return { success: false, error: "Cannot change an admin's role." };
    if (user.role === targetRole) {
      return { success: false, error: `This user is already ${targetRole === "ADMIN" ? "an admin" : "a moderator"}.` };
    }

    await db.user.update({ where: { id: user.id }, data: { role: targetRole } });

    await db.auditLog
      .create({
        data: {
          adminId:    session.user.id,
          adminName:  session.user.name,
          action:     "STATUS_CHANGE",
          targetId:   user.id,
          targetType: "USER",
          details:    `Changed ${user.name} from ${user.role} to ${targetRole}`,
        },
      })
      .catch(() => undefined);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update user role." };
  }
}

// ─── revokeMember ─────────────────────────────────────────────────────────────
// Downgrades a moderator (any admin) or an admin (super admin only) to USER.

export async function revokeMember(userId: string): Promise<RevokeResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(userId)) return { success: false, error: "Invalid user ID." };

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!user) return { success: false, error: "User not found." };
    if (user.id === session.user.id) return { success: false, error: "You cannot revoke your own access." };
    if (user.role === "ADMIN" && !canManageAdmins(session.user.role)) {
      return { success: false, error: "Only the super admin can revoke admin access." };
    }
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "User is not a team member." };
    }

    await db.user.update({ where: { id: userId }, data: { role: "USER" } });

    await db.auditLog
      .create({
        data: {
          adminId:    session.user.id,
          adminName:  session.user.name,
          action:     "STATUS_CHANGE",
          targetId:   userId,
          targetType: "USER",
          details:    `Revoked ${user.role} role from ${user.name}`,
        },
      })
      .catch(() => undefined);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to revoke access." };
  }
}
