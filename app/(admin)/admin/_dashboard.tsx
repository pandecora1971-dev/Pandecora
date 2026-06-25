"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
} from "lucide-react";
import { getSubmissions } from "./actions";
import type { SubmissionRow, SubmissionsFilter, SortField, SortDir, Stats } from "./actions";
import { BANGLADESH_DIVISIONS, DISTRICTS_BY_DIVISION } from "@/lib/validators";

export const PAGE_SIZE = 20;

// ─── Display maps ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  HARASSMENT_BULLYING:           "Harassment / Bullying",
  BLACKMAIL_THREATS:             "Blackmail / Threats",
  CORRUPTION_BRIBERY_EXTORTION:  "Corruption / Bribery",
  DISCRIMINATION_BIAS:           "Discrimination / Bias",
  ACADEMIC_MALPRACTICE:          "Academic Malpractice",
  THEFT_PROPERTY_DAMAGE:         "Theft / Property Damage",
  OTHER_CRIME_POLICY_VIOLATION:  "Other / Policy Violation",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:      "Pending",
  UNDER_REVIEW: "Under Review",
  RESOLVED:     "Resolved",
};

const URGENCY_CN: Record<string, string> = {
  LOW:      "bg-green-100  text-green-800",
  MEDIUM:   "bg-yellow-100 text-yellow-800",
  HIGH:     "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100    text-red-800",
};

const URGENCY_BAR_COLOR: Record<string, string> = {
  CRITICAL: "#e60000",
  HIGH:     "#f97316",
  MEDIUM:   "#eab308",
  LOW:      "#22c55e",
};

const URGENCY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  UNIVERSITY: "University",
  SCHOOL:     "School",
  COLLEGE:    "College",
  MADRASA:    "Madrasa",
  OTHERS:     "Others",
};

const INSTITUTION_KEYS = Object.keys(INSTITUTION_TYPE_LABELS);

const PROFESSION_LABELS: Record<string, string> = {
  TEACHER:       "Teacher",
  STUDENT:       "Student",
  DOCTOR:        "Doctor",
  ENGINEER:      "Engineer",
  LAWYER:        "Lawyer",
  JOURNALIST:    "Journalist",
  AGRICULTURIST: "Agriculturist",
  OTHERS:        "Others",
};

const PROFESSION_KEYS = Object.keys(PROFESSION_LABELS);

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  adminName:    string;
  initialStats: Stats | null;
  initialRows:  SubmissionRow[];
  initialTotal: number;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard({
  adminName: _adminName,
  initialStats,
  initialRows,
  initialTotal,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Applied (fetched) state
  const [rows,      setRows]      = useState<SubmissionRow[]>(initialRows);
  const [total,     setTotal]     = useState(initialTotal);
  const [page,      setPage]      = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir,   setSortDir]   = useState<SortDir>("desc");
  const [filters,   setFilters]   = useState<SubmissionsFilter>({});
  const [error,     setError]     = useState<string | null>(null);

  // Draft filter state — incident
  const [draftCategory,  setDraftCategory]  = useState("");
  const [draftUrgency,   setDraftUrgency]   = useState("");
  const [draftStatus,    setDraftStatus]    = useState("");
  const [draftDateFrom,  setDraftDateFrom]  = useState("");
  const [draftDateTo,    setDraftDateTo]    = useState("");
  const [draftSearchId,  setDraftSearchId]  = useState("");

  // Draft filter state — submitter
  const [draftName,        setDraftName]        = useState("");
  const [draftRole,        setDraftRole]        = useState("");
  const [draftInstType,    setDraftInstType]    = useState("");
  const [draftDivision,    setDraftDivision]    = useState("");
  const [draftDistrict,    setDraftDistrict]    = useState("");

  // District options driven by division selection
  const districtOptions =
    draftDivision && draftDivision in DISTRICTS_BY_DIVISION
      ? DISTRICTS_BY_DIVISION[draftDivision as keyof typeof DISTRICTS_BY_DIVISION]
      : [];

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch helper ────────────────────────────────────────────────────────────

  function fetchPage(
    nextPage: number,
    nextFilters: SubmissionsFilter,
    nextSortField: SortField,
    nextSortDir: SortDir
  ) {
    setError(null);
    startTransition(async () => {
      const result = await getSubmissions(nextPage, nextFilters, nextSortField, nextSortDir);
      if (result.success) {
        setRows(result.rows);
        setTotal(result.total);
        setPage(nextPage);
        setFilters(nextFilters);
        setSortField(nextSortField);
        setSortDir(nextSortDir);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSort(field: SortField) {
    const nextDir = sortField === field && sortDir === "desc" ? "asc" : "desc";
    fetchPage(1, filters, field, nextDir);
  }

  function handleApply() {
    const f: SubmissionsFilter = {};
    if (draftCategory)  f.category          = draftCategory;
    if (draftUrgency)   f.urgencyLevel      = draftUrgency;
    if (draftStatus)    f.status            = draftStatus;
    if (draftDateFrom)  f.dateFrom          = draftDateFrom;
    if (draftDateTo)    f.dateTo            = draftDateTo;
    if (draftSearchId)  f.searchId          = draftSearchId;
    if (draftName)      f.searchName        = draftName;
    if (draftRole)      f.teacherOrStudent  = draftRole;
    if (draftInstType)  f.institutionType   = draftInstType;
    if (draftDivision)  f.division          = draftDivision;
    if (draftDistrict)  f.district          = draftDistrict;
    fetchPage(1, f, sortField, sortDir);
  }

  function handleReset() {
    setDraftCategory(""); setDraftUrgency("");   setDraftStatus("");
    setDraftDateFrom(""); setDraftDateTo("");    setDraftSearchId("");
    setDraftName("");     setDraftRole("");      setDraftInstType("");
    setDraftDivision(""); setDraftDistrict("");
    fetchPage(1, {}, sortField, sortDir);
  }

  // When division changes, clear the district if it no longer belongs
  function handleDivisionChange(val: string) {
    setDraftDivision(val);
    setDraftDistrict("");
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">Overview of all incident reports</p>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* ── Stats bar ── */}
        {initialStats && <StatsBar stats={initialStats} />}

        {/* ── Filter panel ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">

          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#7e7e7e]" />
              <span className="text-sm font-bold text-[#25282b]">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e60000] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs text-[#7e7e7e] hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={11} />
                Clear all
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">

            {/* ── Group 1: Incident ── */}
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Incident</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} className={selectCn}>
                  <option value="">All categories</option>
                  {CATEGORY_KEYS.map((k) => (
                    <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                  ))}
                </select>

                <select value={draftUrgency} onChange={(e) => setDraftUrgency(e.target.value)} className={selectCn}>
                  <option value="">All urgencies</option>
                  {URGENCY_ORDER.map((u) => (
                    <option key={u} value={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</option>
                  ))}
                </select>

                <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} className={selectCn}>
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="date"
                    value={draftDateFrom}
                    onChange={(e) => setDraftDateFrom(e.target.value)}
                    className={inputCn}
                  />
                  {draftDateFrom && (
                    <button onClick={() => setDraftDateFrom("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="date"
                    value={draftDateTo}
                    onChange={(e) => setDraftDateTo(e.target.value)}
                    className={inputCn}
                  />
                  {draftDateTo && (
                    <button onClick={() => setDraftDateTo("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]/60" />
                  <input
                    type="text"
                    value={draftSearchId}
                    onChange={(e) => setDraftSearchId(e.target.value)}
                    placeholder="Search by ID…"
                    maxLength={36}
                    className={`${inputCn} pl-8`}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* ── Group 2: Submitter ── */}
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Submitter</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

                {/* Name search */}
                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]/60" />
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Name…"
                    maxLength={100}
                    className={`${inputCn} pl-8`}
                  />
                </div>

                {/* Profession */}
                <select value={draftRole} onChange={(e) => setDraftRole(e.target.value)} className={selectCn}>
                  <option value="">All professions</option>
                  {PROFESSION_KEYS.map((k) => (
                    <option key={k} value={k}>{PROFESSION_LABELS[k]}</option>
                  ))}
                </select>

                {/* Institution type */}
                <select value={draftInstType} onChange={(e) => setDraftInstType(e.target.value)} className={selectCn}>
                  <option value="">All institution types</option>
                  {INSTITUTION_KEYS.map((k) => (
                    <option key={k} value={k}>{INSTITUTION_TYPE_LABELS[k]}</option>
                  ))}
                </select>

                {/* Division */}
                <select value={draftDivision} onChange={(e) => handleDivisionChange(e.target.value)} className={selectCn}>
                  <option value="">All divisions</option>
                  {BANGLADESH_DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* District — dropdown if division selected, text input otherwise */}
                {districtOptions.length > 0 ? (
                  <select value={draftDistrict} onChange={(e) => setDraftDistrict(e.target.value)} className={selectCn}>
                    <option value="">All districts</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]/60" />
                    <input
                      type="text"
                      value={draftDistrict}
                      onChange={(e) => setDraftDistrict(e.target.value)}
                      placeholder="District…"
                      maxLength={100}
                      className={`${inputCn} pl-8`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Active filter chips ── */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(filters).map(([key, val]) =>
                  val ? (
                    <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-[#e60000]/8 border border-[#e60000]/20 px-2.5 py-0.5 text-xs font-medium text-[#e60000]">
                      <FilterChipLabel filterKey={key} value={val} />
                      <button
                        onClick={() => {
                          const next = { ...filters, [key]: undefined };
                          fetchPage(1, next, sortField, sortDir);
                          syncDraftFromFilters(key, next);
                        }}
                        className="hover:text-[#cc0000]"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ) : null
                )}
              </div>
            )}

            {/* ── Apply / Reset buttons ── */}
            <div className="flex items-center gap-2 pt-1">
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
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* ── Error banner ── */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Results summary ── */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-[#7e7e7e]">
            {total === 0
              ? "No submissions found"
              : `${total.toLocaleString()} submission${total !== 1 ? "s" : ""}${activeFilterCount > 0 ? " (filtered)" : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPage(page - 1, filters, sortField, sortDir)}
              disabled={page <= 1 || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-[#7e7e7e] min-w-[7rem] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1, filters, sortField, sortDir)}
              disabled={page >= totalPages || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <section className={`rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm ${isPending ? "opacity-60 pointer-events-none" : ""} transition-opacity`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <Th>ID</Th>
                  <SortTh field="createdAt"   current={sortField} dir={sortDir} onSort={handleSort}>Date</SortTh>
                  <SortTh field="category"    current={sortField} dir={sortDir} onSort={handleSort}>Category</SortTh>
                  <SortTh field="urgencyLevel" current={sortField} dir={sortDir} onSort={handleSort}>Urgency</SortTh>
                  <Th>Status</Th>
                  <Th>Submitter</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#7e7e7e]">
                      No submissions match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <SubmissionRowEl key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Bottom pagination ── */}
        <div className="flex items-center justify-between text-sm pb-4">
          <p className="text-[#7e7e7e]">
            {total.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPage(page - 1, filters, sortField, sortDir)}
              disabled={page <= 1 || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-[#7e7e7e] min-w-[7rem] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1, filters, sortField, sortDir)}
              disabled={page >= totalPages || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </main>
    </div>
  );

  // Helper — sync the draft state when removing an individual chip
  function syncDraftFromFilters(removedKey: string, next: SubmissionsFilter) {
    if (removedKey === "category")         setDraftCategory(next.category        ?? "");
    if (removedKey === "urgencyLevel")     setDraftUrgency(next.urgencyLevel     ?? "");
    if (removedKey === "status")           setDraftStatus(next.status            ?? "");
    if (removedKey === "dateFrom")         setDraftDateFrom(next.dateFrom        ?? "");
    if (removedKey === "dateTo")           setDraftDateTo(next.dateTo            ?? "");
    if (removedKey === "searchId")         setDraftSearchId(next.searchId        ?? "");
    if (removedKey === "searchName")       setDraftName(next.searchName          ?? "");
    if (removedKey === "teacherOrStudent") setDraftRole(next.teacherOrStudent    ?? "");
    if (removedKey === "institutionType")  setDraftInstType(next.institutionType ?? "");
    if (removedKey === "division")       { setDraftDivision(next.division        ?? ""); setDraftDistrict(""); }
    if (removedKey === "district")         setDraftDistrict(next.district        ?? "");
  }
}

// ─── StatsBar ──────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: Stats }) {
  const urgencyTotal = Object.values(stats.byUrgency).reduce((a, b) => a + b, 0);
  const topCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Reports" value={stats.total.toLocaleString()} icon={<FileText size={18} className="text-[#e60000]" />} iconBg="bg-red-50" />
      <StatCard label="New Today"     value={stats.newToday.toLocaleString()} icon={<TrendingUp size={18} className="text-orange-500" />} iconBg="bg-orange-50" />
      <StatCard label="Critical"      value={(stats.byUrgency["CRITICAL"] ?? 0).toLocaleString()} icon={<AlertTriangle size={18} className="text-yellow-500" />} iconBg="bg-yellow-50" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-[#7e7e7e]">By Urgency</p>
          <div className="rounded-lg bg-blue-50 p-1.5"><BarChart2 size={18} className="text-blue-500" /></div>
        </div>
        <div className="mt-3 space-y-2">
          {URGENCY_ORDER.map((level) => {
            const count = stats.byUrgency[level] ?? 0;
            const pct   = urgencyTotal > 0 ? (count / urgencyTotal) * 100 : 0;
            return (
              <div key={level}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[#7e7e7e]">{level.charAt(0) + level.slice(1).toLowerCase()}</span>
                  <span className="font-medium text-[#25282b]">{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: URGENCY_BAR_COLOR[level] ?? "#94a3b8" }} />
                </div>
              </div>
            );
          })}
          {urgencyTotal === 0 && <p className="text-xs text-[#7e7e7e]">No data yet</p>}
        </div>
        {topCategories.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3 space-y-1">
            {topCategories.map(([cat, count]) => (
              <div key={cat} className="flex justify-between text-xs">
                <span className="text-[#7e7e7e] truncate pr-2">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="font-medium text-[#25282b] shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconBg }: { label: string; value: string; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[#7e7e7e]">{label}</p>
        <div className={`rounded-lg p-1.5 ${iconBg}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black tabular-nums text-[#25282b]">{value}</p>
    </div>
  );
}

// ─── FilterChipLabel ───────────────────────────────────────────────────────────

const FILTER_CHIP_LABELS: Record<string, (v: string) => string> = {
  category:         (v) => CATEGORY_LABELS[v] ?? v,
  urgencyLevel:     (v) => v.charAt(0) + v.slice(1).toLowerCase(),
  status:           (v) => STATUS_LABELS[v]   ?? v,
  dateFrom:         (v) => `From ${v}`,
  dateTo:           (v) => `To ${v}`,
  searchId:         (v) => `ID: ${v}`,
  searchName:       (v) => `Name: ${v}`,
  teacherOrStudent: (v) => PROFESSION_LABELS[v] ?? v,
  institutionType:  (v) => INSTITUTION_TYPE_LABELS[v] ?? v,
  division:         (v) => v,
  district:         (v) => v,
};

function FilterChipLabel({ filterKey, value }: { filterKey: string; value: string }) {
  const fn = FILTER_CHIP_LABELS[filterKey];
  return <>{fn ? fn(value) : value}</>;
}

// ─── Table helpers ─────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e] whitespace-nowrap">
      {children}
    </th>
  );
}

function SortTh({ field, current, dir, onSort, children }: {
  field: SortField; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void; children: React.ReactNode;
}) {
  const active = current === field;
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e] whitespace-nowrap">
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-[#25282b] transition-colors ${active ? "text-[#25282b]" : ""}`}
      >
        {children}
        <span className={active ? "text-[#e60000]" : "text-[#7e7e7e]/40"}>
          {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </button>
    </th>
  );
}

const INSTITUTION_BADGE: Record<string, string> = {
  UNIVERSITY: "bg-indigo-50 text-indigo-700",
  SCHOOL:     "bg-teal-50   text-teal-700",
  COLLEGE:    "bg-cyan-50   text-cyan-700",
  MADRASA:    "bg-amber-50  text-amber-700",
  OTHERS:     "bg-gray-100  text-gray-600",
};

function SubmissionRowEl({ row }: { row: SubmissionRow }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-[#7e7e7e]">
        {row.shortId}<span className="text-[#7e7e7e]/40">…</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#7e7e7e]">
        {row.createdAt.slice(0, 10)}
      </td>
      <td className="px-4 py-3 text-xs text-[#25282b]">
        {CATEGORY_LABELS[row.category] ?? row.category}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_CN[row.urgencyLevel] ?? ""}`}>
          {row.urgencyLevel.charAt(0) + row.urgencyLevel.slice(1).toLowerCase()}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#7e7e7e]">
        {STATUS_LABELS[row.status] ?? row.status}
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-medium text-[#25282b] truncate max-w-[9rem]" title={row.userName}>
          {row.userName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#7e7e7e]">
            {PROFESSION_LABELS[row.userRole] ?? row.userRole}
          </span>
          <span className="text-[#7e7e7e]/30">·</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${row.institutionType ? (INSTITUTION_BADGE[row.institutionType] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-600"}`}>
            {row.institutionType ? (INSTITUTION_TYPE_LABELS[row.institutionType] ?? row.institutionType) : "—"}
          </span>
          <span className="text-[10px] text-[#7e7e7e]">{row.division}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Link href={`/admin/submissions/${row.id}`} className="text-xs font-semibold text-[#e60000] hover:underline whitespace-nowrap">
          View →
        </Link>
      </td>
    </tr>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const selectCn =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm " +
  "text-[#25282b] focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";

const inputCn =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm " +
  "text-[#25282b] placeholder:text-[#7e7e7e]/60 focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";
