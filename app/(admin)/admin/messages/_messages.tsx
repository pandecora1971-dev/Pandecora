"use client";

import { useState, useTransition } from "react";
import {
  Search,
  Trash2,
  AlertTriangle,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Globe,
} from "lucide-react";
import { getMessages, deleteMessage } from "./actions";

const PAGE_SIZE = 20;
import type { MessageRow } from "./actions";

interface Props {
  initialRows:  MessageRow[];
  initialTotal: number;
  canDelete: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MessagesClient({ initialRows, initialTotal, canDelete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rows,  setRows]  = useState<MessageRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page,  setPage]  = useState(1);
  const [searchDraft,   setSearchDraft]   = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [selected, setSelected] = useState<MessageRow | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);
  const [isDeleting,   startDeleteTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function fetchPage(nextPage: number, search: string) {
    setError(null);
    startTransition(async () => {
      const result = await getMessages(nextPage, search || undefined);
      if (result.success) {
        setRows(result.rows);
        setTotal(result.total);
        setPage(nextPage);
        setAppliedSearch(search);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSearch() { fetchPage(1, searchDraft); }
  function handleReset()  { setSearchDraft(""); fetchPage(1, ""); }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteMessage(deleteTarget);
      if (result.success) {
        setDeleteTarget(null);
        if (selected?.id === deleteTarget) setSelected(null);
        fetchPage(page, appliedSearch);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Contact Messages</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">
          Enquiries submitted via the public contact form
          {total > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-[#e60000]/10 px-2 py-0.5 text-xs font-semibold text-[#e60000]">
              {total} total
            </span>
          )}
        </p>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Search bar ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name, email, or message…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#25282b] placeholder:text-gray-400 focus:border-[#e60000] focus:outline-none focus:ring-2 focus:ring-[#e60000]/15"
            />
          </div>
          <button
            onClick={handleSearch} disabled={isPending}
            className="rounded-xl bg-[#25282b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1c1e] disabled:opacity-50"
          >
            Search
          </button>
          {appliedSearch && (
            <button
              onClick={handleReset} disabled={isPending}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#7e7e7e] transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {rows.length === 0 && !isPending && (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
            <Mail size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-[#25282b]">No messages yet</p>
            <p className="mt-1 text-xs text-[#7e7e7e]">
              {appliedSearch ? "No results for that search." : "Messages sent via the contact form will appear here."}
            </p>
          </div>
        )}

        {/* ── Table ── */}
        {rows.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Sender</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Preview</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Received</th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#25282b]">{row.name}</p>
                        <p className="text-xs text-[#7e7e7e]">{row.email}</p>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="truncate text-[#25282b]">{row.message}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[#7e7e7e]">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelected(row)}
                            title="View message"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#25282b]"
                          >
                            <Eye size={15} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => { setDeleteTarget(row.id); setDeleteError(null); }}
                              title="Delete"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-[#e60000]"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-[#7e7e7e]">
                  Page {page} of {totalPages} · {total} messages
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchPage(page - 1, appliedSearch)}
                    disabled={page <= 1 || isPending}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#25282b] disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => fetchPage(page + 1, appliedSearch)}
                    disabled={page >= totalPages || isPending}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#25282b] disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-[#e60000]" />
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25282b]">Contact Message</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#25282b]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Sender info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">Name</p>
                  <p className="mt-1 font-semibold text-[#25282b]">{selected.name}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">Email</p>
                  <a href={`mailto:${selected.email}`} className="mt-1 block font-semibold text-[#e60000] hover:underline truncate">
                    {selected.email}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                  <Calendar size={13} className="shrink-0 text-[#7e7e7e]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">Received</p>
                    <p className="mt-0.5 text-xs text-[#25282b]">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
                {selected.ipAddress && (
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
                    <Globe size={13} className="shrink-0 text-[#7e7e7e]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">IP Address</p>
                      <p className="mt-0.5 font-mono text-xs text-[#25282b]">{selected.ipAddress}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message body */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">Message</p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#25282b]">
                    {selected.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-gray-100 px-6 py-4">
              {canDelete ? (
                <button
                  onClick={() => { setDeleteTarget(selected.id); setDeleteError(null); setSelected(null); }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#e60000] transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <a
                href={`mailto:${selected.email}?subject=Re: your enquiry`}
                className="rounded-lg bg-[#25282b] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a1c1e]"
              >
                Reply by email
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-[#e60000]" />
            <div className="px-6 py-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="text-[#e60000]" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#25282b]">Delete Message</h3>
                  <p className="mt-1.5 text-sm text-[#7e7e7e] leading-relaxed">
                    This message will be permanently deleted. This cannot be undone.
                  </p>
                </div>
              </div>
              {deleteError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {deleteError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#25282b] transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm} disabled={isDeleting}
                  className="rounded-lg bg-[#e60000] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
