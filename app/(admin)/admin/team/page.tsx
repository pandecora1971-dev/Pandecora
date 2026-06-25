import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { getModerators } from "./actions";
import TeamClient from "./_team";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team — Admin" };

export default async function TeamPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");

  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") redirect("/admin");

  const result = await getModerators();
  const initialRows = result.success ? result.rows : [];

  return <TeamClient initialRows={initialRows} />;
}
