"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validators";
import { rateLimitByIP } from "@/lib/rate-limit";

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function sendContactMessage(
  raw: unknown
): Promise<ContactActionResult> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown";

  // 3 messages per IP per hour
  const rl = rateLimitByIP(ip, 3, 60 * 60_000, "contact");
  if (!rl.success) {
    return {
      success: false,
      error: "Too many messages from your connection. Please try again in an hour.",
    };
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await db.contactMessage.create({
      data: {
        name:      parsed.data.name,
        email:     parsed.data.email,
        message:   parsed.data.message,
        ipAddress: ip === "unknown" ? null : ip,
      },
    });
  } catch {
    return { success: false, error: "Failed to send your message. Please try again." };
  }

  return { success: true };
}
