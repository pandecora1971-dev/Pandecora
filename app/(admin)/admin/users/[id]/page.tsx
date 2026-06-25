import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { getUserDetail } from "../../actions";
import UserDetailClient from "./_detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");
  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const result = await getUserDetail(id);
  if (!result.success) notFound();

  return <UserDetailClient user={result.user} />;
}
