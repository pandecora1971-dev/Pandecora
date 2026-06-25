import "server-only";

import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { isStaff, canDelete } from "@/lib/roles";
import { getSubmission } from "./actions";
import SubmissionDetailClient from "./_detail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Submission ${id.slice(0, 8)}` };
}

export default async function SubmissionDetailPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");

  const session = await validateSession(token);
  if (!session || !isStaff(session.user.role)) redirect("/admin/login");

  const result = await getSubmission(id);

  if (!result.success) {
    if (result.notFound) notFound();
    redirect("/admin");
  }

  return (
    <SubmissionDetailClient
      submission={result.submission}
      canDelete={canDelete(session.user.role)}
    />
  );
}
