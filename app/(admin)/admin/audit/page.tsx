import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { getAuditLogs } from "../actions";
import AuditClient from "./_audit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit Log — Admin" };

export default async function AuditPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");
  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const result = await getAuditLogs(1, {});
  const initialRows = result.success ? result.rows : [];
  const initialTotal = result.success ? result.total : 0;

  return <AuditClient initialRows={initialRows} initialTotal={initialTotal} />;
}
