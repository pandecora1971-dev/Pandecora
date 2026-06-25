"use client";

import { useState, useTransition } from "react";
import {
  ShieldAlert,
  LogIn,
  LogOut,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  Monitor,
  X,
  UserCheck,
  FileText,
  Save,
  User,
  Shield,
} from "lucide-react";
import { getAuditLogs } from "../actions";
import type { AuditRow, AuditFilter } from "../actions";

const PAGE_SIZE = 20;

// ─── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label: string;
  icon:  React.ReactNode;
  badge: string;   // badge pill colors
  stripe: string;  // left border color
  bg: string;      // row tinted background
  hover: string;   // row hover
}> = {
  LOGIN:         { label: "Login",         icon: <LogIn      size={13} />, badge: "bg-emerald-100 text-emerald-700 border-emerald-300", stripe: "border-l-emerald-500", bg: "bg-emerald-50/60",  hover: "hover:bg-emerald-50" },
  LOGOUT:        { label: "Logout",        icon: <LogOut     size={13} />, badge: "bg-slate-100   text-slate-600   border-slate-300",   stripe: "border-l-slate-400",   bg: "bg-slate-50/60",    hover: "hover:bg-slate-50"   },
  SIGNUP:        { label: "Sign Up",       icon: <UserCheck  size={13} />, badge: "bg-teal-100    text-teal-700    border-teal-300",     stripe: "border-l-teal-500",    bg: "bg-teal-50/60",     hover: "hover:bg-teal-50"    },
  VIEW:          { label: "View",          icon: <Eye        size={13} />, badge: "bg-blue-100    text-blue-700    border-blue-300",     stripe: "border-l-blue-500",    bg: "bg-blue-50/60",     hover: "hover:bg-blue-50"    },
  DOWNLOAD:      { label: "Download",      icon: <Download   size={13} />, badge: "bg-violet-100  text-violet-700  border-violet-300",   stripe: "border-l-violet-500",  bg: "bg-violet-50/60",   hover: "hover:bg-violet-50"  },
  DELETE:        { label: "Delete",        icon: <Trash2     size={13} />, badge: "bg-red-100     text-red-700     border-red-300",      stripe: "border-l-red-500",     bg: "bg-red-50/60",      hover: "hover:bg-red-50"     },
  STATUS_CHANGE: { label: "Status Change", icon: <RefreshCw  size={13} />, badge: "bg-amber-100   text-amber-700   border-amber-300",    stripe: "border-l-amber-500",   bg: "bg-amber-50/60",    hover: "hover:bg-amber-50"   },
  SUBMIT_REPORT: { label: "Submit Report", icon: <FileText   size={13} />, badge: "bg-orange-100  text-orange-700  border-orange-300",   stripe: "border-l-orange-500",  bg: "bg-orange-50/60",   hover: "hover:bg-orange-50"  },
  SAVE_DRAFT:    { label: "Save Draft",    icon: <Save       size={13} />, badge: "bg-sky-100     text-sky-700     border-sky-300",      stripe: "border-l-sky-500",     bg: "bg-sky-50/60",      hover: "hover:bg-sky-50"     },
};

const ACTION_KEYS = Object.keys(ACTION_CONFIG);
const TARGET_TYPES = ["SUBMISSION", "USER", "FILE"];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialRows:  AuditRow[];
  initialTotal: number;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AuditClient({ initialRows, initialTotal }: Props) {
  const [isPending, startTransition] = useTransition();

  const [rows,   setRows]   = useState<AuditRow[]>(initialRows);
  const [total,  setTotal]  = useState(initialTotal);
  const [page,   setPage]   = useState(1);
  const [filter, setFilter] = useState<AuditFilter>({});
  const [error,  setError]  = useState<string | null>(null);

  const [draftAction,     setDraftAction]     = useState("");
  const [draftTargetType, setDraftTargetType] = useState("");
  const [draftActorType,  setDraftActorType]  = useState<"admin" | "user" | "">("");
  const [draftDateFrom,   setDraftDateFrom]   = useState("");
  const [draftDateTo,     setDraftDateTo]     = useState("");

  const totalPages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = Object.values(filter).filter(Boolean).length;

  function fetchPage(nextPage: number, nextFilter: AuditFilter) {
    setError(null);
    startTransition(async () => {
      const result = await getAuditLogs(nextPage, nextFilter);
      if (result.success) {
        setRows(result.rows);
        setTotal(result.total);
        setPage(nextPage);
        setFilter(nextFilter);
      } else {
        setError(result.error);
      }
    });
  }

  function handleApply() {
    const f: AuditFilter = {};
    if (draftAction)     f.action     = draftAction;
    if (draftTargetType) f.targetType = draftTargetType;
    if (draftActorType)  f.actorType  = draftActorType as "admin" | "user";
    if (draftDateFrom)   f.dateFrom   = draftDateFrom;
    if (draftDateTo)     f.dateTo     = draftDateTo;
    fetchPage(1, f);
  }

  function handleReset() {
    setDraftAction("");
    setDraftTargetType("");
    setDraftActorType("");
    setDraftDateFrom("");
    setDraftDateTo("");
    fetchPage(1, {});
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Audit Log</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">
          Complete record of all activity — user signups, logins, report submissions, admin views, downloads, and status changes
        </p>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-5">

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {ACTION_KEYS.map((key) => {
            const cfg = ACTION_CONFIG[key];
            const count = rows.filter((r) => r.action === key).length;
            const active = filter.action === key;
            return (
              <button
                key={key}
                onClick={() => {
                  const f = { ...filter, action: active ? undefined : key };
                  setDraftAction(active ? "" : key);
                  fetchPage(1, f);
                }}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                  active ? `${cfg.badge} shadow-sm ring-1 ring-inset ring-current/20` : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className={`flex items-center gap-1 mb-1 ${active ? "" : "text-[#7e7e7e]"}`}>
                  {cfg.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{cfg.label}</span>
                </div>
                <p className="text-lg font-black text-[#25282b] tabular-nums">{count}</p>
              </button>
            );
          })}
        </div>

        {/* ── Filter panel ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#7e7e7e]" />
              <span className="text-sm font-bold text-[#25282b]">Filters</span>
              {activeFilters > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e60000] text-[10px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </div>
            {activeFilters > 0 && (
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs text-[#7e7e7e] hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <select value={draftAction} onChange={(e) => setDraftAction(e.target.value)} className={selectCn}>
                <option value="">All action types</option>
                {ACTION_KEYS.map((k) => (
                  <option key={k} value={k}>{ACTION_CONFIG[k].label}</option>
                ))}
              </select>

              <select value={draftActorType} onChange={(e) => setDraftActorType(e.target.value as "admin" | "user" | "")} className={selectCn}>
                <option value="">All actors</option>
                <option value="admin">Admin only</option>
                <option value="user">Users only</option>
              </select>

              <select value={draftTargetType} onChange={(e) => setDraftTargetType(e.target.value)} className={selectCn}>
                <option value="">All target types</option>
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>

              <div className="relative">
                <input type="date" value={draftDateFrom} onChange={(e) => setDraftDateFrom(e.target.value)} className={inputCn} />
                {draftDateFrom && (
                  <button onClick={() => setDraftDateFrom("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="relative">
                <input type="date" value={draftDateTo} onChange={(e) => setDraftDateTo(e.target.value)} className={inputCn} />
                {draftDateTo && (
                  <button onClick={() => setDraftDateTo("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleApply}
                disabled={isPending}
                className="rounded-xl bg-[#e60000] px-5 py-2 text-sm font-semibold text-white hover:bg-[#cc0000] disabled:opacity-50 transition-colors"
              >
                {isPending ? "Loading…" : "Apply Filters"}
              </button>
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-[#25282b] hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-[#7e7e7e]">
            {total === 0 ? "No entries" : `${total.toLocaleString()} entr${total !== 1 ? "ies" : "y"}${activeFilters > 0 ? " (filtered)" : ""}`}
          </p>
          <Pagination page={page} totalPages={totalPages} isPending={isPending}
            onPrev={() => fetchPage(page - 1, filter)}
            onNext={() => fetchPage(page + 1, filter)} />
        </div>

        {/* ── Log entries ── */}
        <div className={`rounded-2xl border border-gray-200 overflow-hidden shadow-sm ${isPending ? "opacity-60 pointer-events-none" : ""} transition-opacity`}>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 bg-white text-[#7e7e7e]">
              <ShieldAlert size={36} className="opacity-25" />
              <p className="text-sm font-medium">No audit log entries found.</p>
              {activeFilters > 0 && (
                <button onClick={handleReset} className="text-xs text-[#e60000] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100/80">
              {rows.map((row) => <AuditEntry key={row.id} row={row} />)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm pb-4">
          <p className="text-[#7e7e7e]">{total.toLocaleString()} total</p>
          <Pagination page={page} totalPages={totalPages} isPending={isPending}
            onPrev={() => fetchPage(page - 1, filter)}
            onNext={() => fetchPage(page + 1, filter)} />
        </div>

      </main>
    </div>
  );
}

// ─── AuditEntry ────────────────────────────────────────────────────────────────

function AuditEntry({ row }: { row: AuditRow }) {
  const cfg = ACTION_CONFIG[row.action] ?? {
    label:  row.action,
    icon:   <ShieldAlert size={13} />,
    badge:  "bg-gray-100 text-gray-600 border-gray-200",
    stripe: "border-l-gray-400",
    bg:     "bg-gray-50/60",
    hover:  "hover:bg-gray-50",
  };

  const date    = new Date(row.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className={`flex gap-4 px-5 py-4 border-l-[4px] transition-colors ${cfg.stripe} ${cfg.bg} ${cfg.hover}`}>

      {/* Action badge */}
      <div className="shrink-0 pt-0.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${cfg.badge}`}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Actor + details */}
        <p className="text-sm text-[#25282b] flex items-center gap-1.5 flex-wrap">
          {row.adminId ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Shield size={12} className="text-[#e60000] shrink-0" />
              {row.adminName ?? "Admin"}
              <span className="text-[10px] font-normal bg-[#e60000]/10 text-[#e60000] rounded px-1.5 py-0.5">admin</span>
            </span>
          ) : row.userId ? (
            <a
              href={`/admin/users/${row.userId}`}
              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
            >
              <User size={12} className="shrink-0" />
              {row.userName ?? "Unknown user"}
              <span className="text-[10px] font-normal bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">user</span>
            </a>
          ) : (
            <span className="font-semibold text-[#7e7e7e]">System</span>
          )}
          {row.details && (
            <span className="text-[#7e7e7e]">— {row.details}</span>
          )}
        </p>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7e7e7e]">
          {row.targetId && (
            <span className="inline-flex items-center gap-1 rounded bg-white/80 border border-gray-200 px-1.5 py-0.5 font-mono text-[10px]">
              {row.targetType && <span className="text-[#7e7e7e]/60 mr-0.5">{row.targetType} ·</span>}
              {row.targetId.slice(0, 8)}…
            </span>
          )}
          {row.ipAddress && (
            <span className="inline-flex items-center gap-1">
              <Monitor size={10} className="opacity-50 shrink-0" />
              {row.ipAddress}
            </span>
          )}
          {row.userAgent && (
            <span className="truncate max-w-[220px] opacity-55" title={row.userAgent}>
              {row.userAgent.slice(0, 55)}{row.userAgent.length > 55 ? "…" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-[#25282b] tabular-nums">{timeStr}</p>
        <p className="text-[11px] text-[#7e7e7e]">{dateStr}</p>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, isPending, onPrev, onNext }: {
  page: number; totalPages: number; isPending: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} disabled={page <= 1 || isPending}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors">
        Previous
      </button>
      <span className="text-[#7e7e7e] min-w-[7rem] text-center text-sm">
        Page {page} of {totalPages}
      </span>
      <button onClick={onNext} disabled={page >= totalPages || isPending}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors">
        Next
      </button>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const selectCn =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#25282b] " +
  "focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";

const inputCn =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#25282b] " +
  "focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";
