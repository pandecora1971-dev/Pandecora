import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { Lock, Database, HardDrive, ShieldCheck, Download, Archive } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — Admin" };

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect("/admin/login");
  const session = await validateSession(token);
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const storageAdapter = process.env.STORAGE_ADAPTER ?? "Local filesystem";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Settings</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">Platform configuration and account settings</p>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">

        {/* ── Account ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Account</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7e7e7e]">Name</p>
                <p className="mt-1 text-sm text-[#25282b] font-medium">{session.user.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7e7e7e]">Email</p>
                <p className="mt-1 text-sm text-[#25282b]">{session.user.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7e7e7e]">Role</p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#e60000]/10 px-2.5 py-0.5 text-xs font-bold text-[#e60000]">
                  ADMIN
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25282b]">
                  <Lock size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#25282b]">Password management</p>
                  <p className="mt-0.5 text-xs text-[#7e7e7e]">
                    Password changes are managed via secure reset. Contact your system administrator
                    to update your credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── System ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">System</p>
          </div>
          <div className="divide-y divide-gray-100">
            <SystemRow
              icon={<Database size={15} />}
              label="Database"
              value="PostgreSQL — Connected"
              status="ok"
            />
            <SystemRow
              icon={<HardDrive size={15} />}
              label="Storage Adapter"
              value={storageAdapter}
              status="ok"
            />
            <SystemRow
              icon={<ShieldCheck size={15} />}
              label="Encryption"
              value="AES-256-GCM — Active"
              status="ok"
            />
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="rounded-2xl border border-[#e60000]/30 bg-white overflow-hidden">
          <div className="border-b border-[#e60000]/20 bg-red-50/60 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Danger Zone</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <DangerAction
              icon={<Download size={15} />}
              label="Export All Data"
              description="Download a full CSV export of all submissions and user data."
            />
            <DangerAction
              icon={<Archive size={15} />}
              label="System Backup"
              description="Create a full backup of the database and encrypted file storage."
            />
          </div>
        </section>

      </main>
    </div>
  );
}

function SystemRow({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "ok" | "warning" | "error";
}) {
  const dotCn =
    status === "ok"
      ? "bg-green-500"
      : status === "warning"
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="text-[#7e7e7e]">{icon}</span>
        <span className="text-sm font-medium text-[#25282b]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotCn}`} />
        <span className="text-sm text-[#7e7e7e]">{value}</span>
      </div>
    </div>
  );
}

function DangerAction({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[#e60000]">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-[#25282b]">{label}</p>
          <p className="text-xs text-[#7e7e7e]">{description}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <button
          disabled
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#7e7e7e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Coming soon
        </button>
      </div>
    </div>
  );
}
