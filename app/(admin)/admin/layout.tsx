import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import AdminSidebar from "./_sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    const session = await validateSession(token);
    if (session && (session.user.role === "ADMIN" || session.user.role === "MODERATOR")) {
      return (
        <div className="flex min-h-screen bg-gray-50">
          <AdminSidebar
            adminName={session.user.name}
            adminEmail={session.user.email}
            adminRole={session.user.role}
          />
          <div className="flex-1 lg:pl-64 min-h-screen">
            <div className="pt-14 lg:pt-0">{children}</div>
          </div>
        </div>
      );
    }
  }

  // Not authenticated — render children only (login page handles its own layout/redirect)
  return <>{children}</>;
}
