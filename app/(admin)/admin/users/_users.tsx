"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Trash2, AlertTriangle, UserX, Eye, SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { getUsers, deleteUser } from "../actions";
import type { UserRow, UsersFilter } from "../actions";
import { BANGLADESH_DIVISIONS, DISTRICTS_BY_DIVISION } from "@/lib/validators";

const PAGE_SIZE = 20;

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

const PROFESSION_BADGE: Record<string, string> = {
  TEACHER:       "bg-blue-100   text-blue-700",
  STUDENT:       "bg-purple-100 text-purple-700",
  DOCTOR:        "bg-rose-100   text-rose-700",
  ENGINEER:      "bg-amber-100  text-amber-700",
  LAWYER:        "bg-indigo-100 text-indigo-700",
  JOURNALIST:    "bg-orange-100 text-orange-700",
  AGRICULTURIST: "bg-green-100  text-green-700",
  OTHERS:        "bg-gray-100   text-gray-600",
};

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  UNIVERSITY: "University",
  SCHOOL:     "School",
  COLLEGE:    "College",
  MADRASA:    "Madrasa",
  OTHERS:     "Others",
};

const ACADEMIC_PROFESSIONS = new Set(["TEACHER", "STUDENT"]);

interface Props {
  initialRows: UserRow[];
  initialTotal: number;
  canDelete: boolean;
}

export default function UsersClient({ initialRows, initialTotal, canDelete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<UserRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<UsersFilter>({});
  const [error, setError] = useState<string | null>(null);

  // Draft filter state
  const [draftSearch,      setDraftSearch]      = useState("");
  const [draftProfession,  setDraftProfession]  = useState("");
  const [draftInstType,    setDraftInstType]    = useState("");
  const [draftDivision,    setDraftDivision]    = useState("");
  const [draftDistrict,    setDraftDistrict]    = useState("");

  const districtOptions =
    draftDivision && draftDivision in DISTRICTS_BY_DIVISION
      ? DISTRICTS_BY_DIVISION[draftDivision as keyof typeof DISTRICTS_BY_DIVISION]
      : [];

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function fetchPage(nextPage: number, filters: UsersFilter) {
    setError(null);
    startTransition(async () => {
      const result = await getUsers(nextPage, filters);
      if (result.success) {
        setRows(result.rows);
        setTotal(result.total);
        setPage(nextPage);
        setAppliedFilters(filters);
      } else {
        setError(result.error);
      }
    });
  }

  function handleApply() {
    const f: UsersFilter = {};
    if (draftSearch.trim())  f.search        = draftSearch.trim();
    if (draftProfession)     f.profession    = draftProfession;
    if (draftInstType)       f.institutionType = draftInstType;
    if (draftDivision)       f.division      = draftDivision;
    if (draftDistrict.trim()) f.district     = draftDistrict.trim();
    fetchPage(1, f);
  }

  function handleReset() {
    setDraftSearch(""); setDraftProfession(""); setDraftInstType("");
    setDraftDivision(""); setDraftDistrict("");
    fetchPage(1, {});
  }

  function handleDivisionChange(val: string) {
    setDraftDivision(val);
    setDraftDistrict("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteUser(deleteTarget);
      if (result.success) {
        setDeleteTarget(null);
        fetchPage(page, appliedFilters);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  const selectCn =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm " +
    "text-[#25282b] focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";

  const inputCn =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm " +
    "text-[#25282b] placeholder:text-[#7e7e7e]/60 focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/20";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Users</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">Manage registered user accounts</p>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* ── Filter panel ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-[#7e7e7e]" />
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

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

              {/* Name search */}
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]/60" />
                <input
                  type="text"
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApply()}
                  placeholder="Name…"
                  maxLength={100}
                  className={`${inputCn} pl-8`}
                />
              </div>

              {/* Profession */}
              <select value={draftProfession} onChange={(e) => setDraftProfession(e.target.value)} className={selectCn}>
                <option value="">All professions</option>
                {Object.entries(PROFESSION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {/* Institution type (academic only) */}
              <select value={draftInstType} onChange={(e) => setDraftInstType(e.target.value)} className={selectCn}>
                <option value="">All institution types</option>
                {Object.entries(INSTITUTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {/* Division */}
              <select value={draftDivision} onChange={(e) => handleDivisionChange(e.target.value)} className={selectCn}>
                <option value="">All divisions</option>
                {BANGLADESH_DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* District */}
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

            {/* Active chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(appliedFilters).map(([key, val]) =>
                  val ? (
                    <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-[#e60000]/8 border border-[#e60000]/20 px-2.5 py-0.5 text-xs font-medium text-[#e60000]">
                      {key === "profession" ? PROFESSION_LABELS[val] ?? val
                        : key === "institutionType" ? INSTITUTION_TYPE_LABELS[val] ?? val
                        : key === "search" ? `Name: ${val}`
                        : val}
                      <button
                        onClick={() => {
                          const next = { ...appliedFilters, [key]: undefined };
                          fetchPage(1, next);
                          if (key === "search")       setDraftSearch("");
                          if (key === "profession")   setDraftProfession("");
                          if (key === "institutionType") setDraftInstType("");
                          if (key === "division")   { setDraftDivision(""); setDraftDistrict(""); }
                          if (key === "district")     setDraftDistrict("");
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

            <div className="flex items-center gap-2">
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

        {/* ── Error ── */}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${isPending ? "opacity-60 pointer-events-none" : ""} transition-opacity`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Profession</Th>
                  <Th>Institution / Organisation</Th>
                  <Th>Location</Th>
                  <Th>Joined</Th>
                  <Th>Reports</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#7e7e7e]">
                        <UserX size={32} className="opacity-30" />
                        <p className="text-sm">No users found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((user) => {
                    const isAcademic = ACADEMIC_PROFESSIONS.has(user.teacherOrStudent);
                    const orgDisplay = isAcademic
                      ? user.institutionName
                      : (user.organizationName ?? user.specialization);
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#25282b]">{user.name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7e7e7e] max-w-[200px] truncate">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PROFESSION_BADGE[user.teacherOrStudent] ?? "bg-gray-100 text-gray-600"}`}>
                            {PROFESSION_LABELS[user.teacherOrStudent] ?? user.teacherOrStudent}
                          </span>
                          {isAcademic && user.institutionType && (
                            <p className="mt-0.5 text-[10px] text-[#7e7e7e]">
                              {INSTITUTION_TYPE_LABELS[user.institutionType] ?? user.institutionType}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7e7e7e] max-w-[160px] truncate" title={orgDisplay ?? ""}>
                          {orgDisplay ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7e7e7e]">
                          <p>{user.upazila}</p>
                          <p className="text-[10px] text-[#7e7e7e]/70">{user.district}, {user.division}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7e7e7e] whitespace-nowrap">
                          {user.createdAt.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-[#25282b]">
                            {user.submissionCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="rounded-md border border-gray-200 p-1.5 text-[#7e7e7e] hover:bg-gray-50 hover:text-[#25282b] transition-colors"
                              title="View user"
                            >
                              <Eye size={14} />
                            </Link>
                            {canDelete && (
                              <button
                                onClick={() => { setDeleteTarget(user.id); setDeleteError(null); }}
                                className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between text-sm">
          <p className="text-[#7e7e7e]">
            {total === 0
              ? "No users"
              : `${total.toLocaleString()} user${total !== 1 ? "s" : ""}${activeFilterCount > 0 ? " (filtered)" : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPage(page - 1, appliedFilters)}
              disabled={page <= 1 || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-[#7e7e7e] min-w-[7rem] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1, appliedFilters)}
              disabled={page >= totalPages || isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#25282b] disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </main>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-2xl mx-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-[#e60000]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#25282b]">Delete User</h3>
                <p className="mt-2 text-sm text-[#7e7e7e]">
                  This will permanently delete the user and all their submissions.{" "}
                  <strong className="text-[#25282b]">This cannot be undone.</strong>
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#25282b] hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="rounded-lg bg-[#e60000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cc0000] disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
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
