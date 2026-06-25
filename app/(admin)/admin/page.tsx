import "server-only";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { getStats, getSubmissions } from "./actions";
import AdminDashboard from "./_dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");

  const session = await validateSession(token);
  if (!session || !isStaff(session.user.role)) redirect("/admin/login");

  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    null;
  const userAgent = headersList.get("user-agent") ?? null;

  const [, statsResult, submissionsResult] = await Promise.all([
    db.auditLog
      .create({
        data: {
          adminId:    session.user.id,
          action:     "VIEW",
          targetType: "DASHBOARD",
          ipAddress,
          userAgent,
        },
      })
      .catch(() => undefined),

    getStats(),
    getSubmissions(1, {}, "createdAt", "desc"),
  ]);

  const initialStats = statsResult.success ? statsResult.stats : null;
  const initialRows  = submissionsResult.success ? submissionsResult.rows  : [];
  const initialTotal = submissionsResult.success ? submissionsResult.total : 0;

  return (
    <AdminDashboard
      adminName={session.user.name}
      initialStats={initialStats}
      initialRows={initialRows}
      initialTotal={initialTotal}
    />
  );
}
