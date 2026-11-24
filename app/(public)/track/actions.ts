"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimitByIP } from "@/lib/rate-limit";
import { trackingCodeSchema } from "@/lib/validators";
import { hashTrackingCode } from "@/lib/guest";

export type TrackResult =
  | {
      success: true;
      status: string;
      category: string;
      urgencyLevel: string;
      createdAt: string;
      updatedAt: string;
    }
  | { success: false; error: string };

/**
 * Looks up a report's status by its public tracking code.
 * Returns only non-sensitive metadata — never description, evidence or identity.
 */
export async function trackReport(rawCode: string): Promise<TrackResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";

  // 20 lookups per IP per hour — makes guessing 50-bit codes infeasible
  const rl = await rateLimitByIP(ip, 20, 60 * 60_000, "track");
  if (!rl.success) {
    return { success: false, error: "অনেকবার চেষ্টা করা হয়েছে। এক ঘণ্টা পরে আবার চেষ্টা করুন।" };
  }

  const parsed = trackingCodeSchema.safeParse(typeof rawCode === "string" ? rawCode : "");
  if (!parsed.success) {
    return { success: false, error: "কোডটি সঠিক নয়। ফরম্যাট: PD-XXXXX-XXXXX" };
  }

  try {
    const row = await db.submission.findUnique({
      where:  { trackingHash: hashTrackingCode(parsed.data) },
      select: { status: true, category: true, urgencyLevel: true, createdAt: true, updatedAt: true },
    });
    if (!row || row.status === "DELETED" || row.status === "DRAFT") {
      return { success: false, error: "এই কোডে কোনো রিপোর্ট পাওয়া যায়নি।" };
    }
    return {
      success:      true,
      status:       row.status,
      category:     row.category,
      urgencyLevel: row.urgencyLevel,
      createdAt:    row.createdAt.toISOString(),
      updatedAt:    row.updatedAt.toISOString(),
    };
  } catch {
    return { success: false, error: "এখন খোঁজা যাচ্ছে না। পরে আবার চেষ্টা করুন।" };
  }
}
