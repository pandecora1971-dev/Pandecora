/**
 * Centralized audit logging.
 * Call with `void audit({ ... })` — errors are swallowed intentionally so that
 * a logging failure never breaks the user-facing request.
 */

import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

export interface AuditEvent {
  action: AuditAction;
  // Admin actor (admin-initiated events)
  adminId?:   string;
  adminName?: string;
  // User actor (user-initiated events)
  userId?:    string;
  userName?:  string;
  // Target
  targetId?:   string;
  targetType?: string;
  // Context
  ipAddress?: string | null;
  userAgent?: string | null;
  details?:   string;
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminId:    event.adminId   ?? null,
        adminName:  event.adminName ?? null,
        userId:     event.userId    ?? null,
        userName:   event.userName  ?? null,
        action:     event.action,
        targetId:   event.targetId   ?? null,
        targetType: event.targetType ?? null,
        ipAddress:  event.ipAddress  ?? null,
        userAgent:  event.userAgent  ?? null,
        details:    event.details    ?? null,
      },
    });
  } catch {
    // Never let audit failure break the request
  }
}
