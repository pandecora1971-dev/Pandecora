import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { isStaff, canDelete } from "@/lib/roles";
import { getUsers } from "../actions";
import UsersClient from "./_users";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users — Admin" };

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");
  const session = await validateSession(token);
  if (!session || !isStaff(session.user.role)) redirect("/admin/login");

  const result = await getUsers(1);
  const initialRows = result.success ? result.rows : [];
  const initialTotal = result.success ? result.total : 0;

  return (
    <UsersClient
      initialRows={initialRows}
      initialTotal={initialTotal}
      canDelete={canDelete(session.user.role)}
    />
  );
}
