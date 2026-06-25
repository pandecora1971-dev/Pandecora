"use client";

import Link from "next/link";
import { ArrowLeft, User, MapPin, Building2, FileText, Activity } from "lucide-react";
import type { UserDetail } from "../../actions";

const URGENCY_BADGE: Record<string, string> = {
  LOW:      "bg-green-100 text-green-700",
  MEDIUM:   "bg-yellow-100 text-yellow-700",
  HIGH:     "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:    "bg-gray-100 text-gray-600",
  REVIEWED:   "bg-blue-100 text-blue-700",
  RESOLVED:   "bg-green-100 text-green-700",
  CLOSED:     "bg-gray-200 text-gray-500",
};

function fmt(val: string | null | undefined, fallback = "—") {
  if (!val) return fallback;
  return val.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

interface Props {
  user: UserDetail;
}

export default function UserDetailClient({ user }: Props) {
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <Link
          href="/admin/users"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7e7e7e] hover:text-[#25282b] transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Users
        </Link>
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">User Profile</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">Full details for {user.name}</p>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">

        {/* ── Identity card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
            <SectionIcon icon={User} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#7e7e7e]">Identity</h2>
          </div>
          <div className="flex items-start gap-5 px-6 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e60000] text-xl font-black text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold text-[#25282b]">{user.name}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.teacherOrStudent === "TEACHER"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {fmt(user.teacherOrStudent)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#7e7e7e]">{user.email}</p>
              <p className="text-sm text-[#7e7e7e]">{user.phone}</p>
              <p className="mt-2 text-xs text-[#7e7e7e]">
                Joined {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatChip label="Reports" value={user.submissions.length >= 10 ? "10+" : String(user.submissions.length)} />
              <StatChip label="Sessions" value={String(user.sessionsCount)} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Location ── */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <SectionIcon icon={MapPin} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#7e7e7e]">Location</h2>
            </div>
            <dl className="divide-y divide-gray-100">
              <Row label="Division" value={user.division} />
              <Row label="District" value={user.district} />
              <Row label="Upazila" value={user.upazila} />
              <Row label="Address" value={user.specificAddress} />
            </dl>
          </div>

          {/* ── Institution ── */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <SectionIcon icon={Building2} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#7e7e7e]">Institution</h2>
            </div>
            <dl className="divide-y divide-gray-100">
              <Row label="Name" value={user.institutionName} />
              <Row label="Type" value={fmt(user.institutionType)} />
              {user.universityType && (
                <Row label="University Type" value={fmt(user.universityType)} />
              )}
              <Row label="Department" value={user.department} />
            </dl>
          </div>
        </div>

        {/* ── Recent submissions ── */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
            <SectionIcon icon={FileText} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#7e7e7e]">Recent Reports</h2>
            {user.submissions.length === 0 && (
              <span className="ml-auto text-xs text-[#7e7e7e]">No submissions</span>
            )}
          </div>

          {user.submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-[#7e7e7e]">
              <Activity size={28} className="opacity-30" />
              <p className="text-sm">This user has not submitted any reports.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <Th>ID</Th>
                    <Th>Category</Th>
                    <Th>Urgency</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {user.submissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#7e7e7e]">
                        <span title={sub.id}>{sub.id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#25282b]">
                        {fmt(sub.category)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_BADGE[sub.urgencyLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {sub.urgencyLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#7e7e7e] whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e60000]/10">
      <Icon size={14} className="text-[#e60000]" />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-1.5 text-right">
      <p className="text-lg font-black text-[#25282b]">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-[#7e7e7e]">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-6 py-3">
      <dt className="shrink-0 text-xs font-medium text-[#7e7e7e]">{label}</dt>
      <dd className="text-right text-sm text-[#25282b]">{value || "—"}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e] whitespace-nowrap">
      {children}
    </th>
  );
}
