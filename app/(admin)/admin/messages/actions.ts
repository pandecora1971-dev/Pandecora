"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";

async function getStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await validateSession(token);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) return null;
  return session;
}

async function getAdminSession() {
  const session = await getStaffSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export interface MessageRow {
  id:        string;
  name:      string;
  email:     string;
  message:   string;
  ipAddress: string | null;
  createdAt: string;
}

export type GetMessagesResult =
  | { success: true;  rows: MessageRow[]; total: number }
  | { success: false; error: string };

export type DeleteMessageResult =
  | { success: true }
  | { success: false; error: string };

const PAGE_SIZE = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMessages(page = 1, search?: string): Promise<GetMessagesResult> {
  const session = await getStaffSession();
  if (!session) return { success: false, error: "Unauthorized." };

  const skip  = (page - 1) * PAGE_SIZE;
  const where = search
    ? {
        OR: [
          { name:    { contains: search, mode: "insensitive" as const } },
          { email:   { contains: search, mode: "insensitive" as const } },
          { message: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [rows, total] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.contactMessage.count({ where }),
  ]);

  return {
    success: true,
    total,
    rows: rows.map((r) => ({
      id:        r.id,
      name:      r.name,
      email:     r.email,
      message:   r.message,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function deleteMessage(id: string): Promise<DeleteMessageResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized." };

  if (!UUID_PATTERN.test(id)) return { success: false, error: "Invalid ID." };

  try {
    await db.contactMessage.delete({ where: { id } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete message." };
  }
}
