import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { isStaff, canDelete } from "@/lib/roles";
import { getMessages } from "./actions";
import MessagesClient from "./_messages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact Messages — Admin" };

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");

  const session = await validateSession(token);
  if (!session || !isStaff(session.user.role)) redirect("/admin/login");

  const result = await getMessages(1);
  const initialRows  = result.success ? result.rows  : [];
  const initialTotal = result.success ? result.total : 0;

  return (
    <MessagesClient
      initialRows={initialRows}
      initialTotal={initialTotal}
      canDelete={canDelete(session.user.role)}
    />
  );
}
