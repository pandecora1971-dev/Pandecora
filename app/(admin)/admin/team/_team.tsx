"use client";

import { useState, useTransition } from "react";
import { UserCog, UserMinus, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { getModerators, promoteToModerator, revokeModerator } from "./actions";
import type { ModeratorRow } from "./actions";

interface Props {
  initialRows: ModeratorRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function TeamClient({ initialRows }: Props) {
  const [rows, setRows] = useState<ModeratorRow[]>(initialRows);

  // Promote form state
  const [email, setEmail] = useState("");
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [isPromoting, startPromoteTransition] = useTransition();

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<ModeratorRow | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, startRevokeTransition] = useTransition();

  function refresh() {
    getModerators().then((r) => {
      if (r.success) setRows(r.rows);
    });
  }

  function handlePromote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPromoteError(null);
    setPromoteSuccess(null);
    const fd = new FormData(e.currentTarget);
    startPromoteTransition(async () => {
      const result = await promoteToModerator(fd);
      if (result.success) {
        setEmail("");
        setPromoteSuccess("User promoted to moderator.");
        refresh();
      } else {
        setPromoteError(result.error);
      }
    });
  }

  function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setRevokeError(null);
    startRevokeTransition(async () => {
      const result = await revokeModerator(revokeTarget.id);
      if (result.success) {
        setRevokeTarget(null);
        refresh();
      } else {
        setRevokeError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Admin</p>
        <h1 className="mt-1 text-2xl font-black text-[#25282b]">Team</h1>
        <p className="mt-0.5 text-sm text-[#7e7e7e]">Manage moderator accounts</p>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">

        {/* ── Promote form ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">Add Moderator</p>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-sm text-[#7e7e7e]">
              Enter the email of a registered user to grant them moderator access. They can then sign
              in here to view submissions, users, and messages — but cannot delete anything.
            </p>
            <form onSubmit={handlePromote} className="flex gap-3">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isPromoting}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#25282b] placeholder:text-gray-400 focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isPromoting || !email.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#25282b] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1a1c1e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus size={14} />
                {isPromoting ? "Promoting…" : "Promote"}
              </button>
            </form>

            {promoteError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={14} className="shrink-0" />
                {promoteError}
              </div>
            )}
            {promoteSuccess && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 size={14} className="shrink-0" />
                {promoteSuccess}
              </div>
            )}
          </div>
        </section>

        {/* ── Current moderators ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
              Current Moderators
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                {rows.length}
              </span>
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-[#7e7e7e]">
              <UserCog size={32} className="opacity-25" />
              <p className="text-sm">No moderators yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((mod) => (
                <li key={mod.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#25282b]">{mod.name}</p>
                    <p className="truncate text-xs text-[#7e7e7e]">{mod.email}</p>
                    <p className="text-[10px] text-gray-400">Since {formatDate(mod.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => { setRevokeTarget(mod); setRevokeError(null); }}
                    className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <UserMinus size={13} />
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>

      {/* ── Revoke modal ── */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isRevoking && setRevokeTarget(null)}
          />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-[#e60000]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#25282b]">Revoke Moderator</h3>
                <p className="mt-1.5 text-sm text-[#7e7e7e]">
                  Remove moderator access from{" "}
                  <strong className="text-[#25282b]">{revokeTarget.name}</strong>? They will be
                  downgraded to a regular user and lose all staff access immediately.
                </p>
              </div>
            </div>

            {revokeError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {revokeError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={isRevoking}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#25282b] hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConfirm}
                disabled={isRevoking}
                className="rounded-lg bg-[#e60000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cc0000] disabled:opacity-50 transition-colors"
              >
                {isRevoking ? "Revoking…" : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
