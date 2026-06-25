"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export interface ModeratorRow {
  id:        string;
  name:      string;
  email:     string;
  createdAt: string;
}

export type GetModeratorsResult =
  | { success: true;  rows: ModeratorRow[] }
  | { success: false; error: string };

export type PromoteResult =
  | { success: true }
  | { success: false; error: string };

export type RevokeResult =
  | { success: true }
  | { success: false; error: string };

// ─── getModerators ─────────────────────────────────────────────────────────────

export async function getModerators(): Promise<GetModeratorsResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  try {
    const rows = await db.user.findMany({
      where: { role: "MODERATOR" },
      select: {
        id: true,
        name: true,
        encryptedEmail: true,
        emailIV: true,
        emailTag: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      rows: rows.map((r) => {
        let email = "[encrypted]";
        try { email = decrypt(r.encryptedEmail, r.emailIV, r.emailTag); } catch { /* keep fallback */ }
        return { id: r.id, name: r.name, email, createdAt: r.createdAt.toISOString() };
      }),
    };
  } catch {
    return { success: false, error: "Failed to load moderators." };
  }
}

// ─── promoteToModerator ────────────────────────────────────────────────────────

export async function promoteToModerator(formData: FormData): Promise<PromoteResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) return { success: false, error: "Email is required." };

  try {
    const { createHash } = await import("crypto");
    const pepper = process.env.HASH_PEPPER ?? "";
    const emailHash = createHash("sha256").update(email + pepper).digest("hex");

    const user = await db.user.findUnique({
      where: { emailHash },
      select: { id: true, role: true, name: true },
    });

    if (!user) return { success: false, error: "No account found with that email." };
    if (user.role === "ADMIN") return { success: false, error: "Cannot change an admin's role." };
    if (user.role === "MODERATOR") return { success: false, error: "This user is already a moderator." };

    await db.user.update({ where: { id: user.id }, data: { role: "MODERATOR" } });

    await db.auditLog
      .create({
        data: {
          adminId:    session.user.id,
          adminName:  session.user.name,
          action:     "STATUS_CHANGE",
          targetId:   user.id,
          targetType: "USER",
          details:    `Promoted ${user.name} to MODERATOR`,
        },
      })
      .catch(() => undefined);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to promote user." };
  }
}

// ─── revokeModerator ───────────────────────────────────────────────────────────

export async function revokeModerator(userId: string): Promise<RevokeResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(userId)) return { success: false, error: "Invalid user ID." };

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!user) return { success: false, error: "User not found." };
    if (user.role !== "MODERATOR") return { success: false, error: "User is not a moderator." };

    await db.user.update({ where: { id: userId }, data: { role: "USER" } });

    await db.auditLog
      .create({
        data: {
          adminId:    session.user.id,
          adminName:  session.user.name,
          action:     "STATUS_CHANGE",
          targetId:   userId,
          targetType: "USER",
          details:    `Revoked moderator role from ${user.name}`,
        },
      })
      .catch(() => undefined);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to revoke moderator role." };
  }
}
