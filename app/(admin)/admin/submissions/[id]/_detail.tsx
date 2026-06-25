"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText as FileTextIcon,
  Image    as ImageIcon,
  Video    as VideoIcon,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  UserCircle2,
  Building2,
  MapPin,
  Clock,
  Link2,
  ShieldCheck,
  ChevronDown,
  Trash2,
  StickyNote,
  Users,
} from "lucide-react";
import { updateStatus, deleteSubmission } from "./actions";
import type { SubmissionDetail, DecryptedFile } from "./actions";

// ─── Display maps ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  HARASSMENT_BULLYING:           "Harassment / Bullying",
  BLACKMAIL_THREATS:             "Blackmail / Threats",
  CORRUPTION_BRIBERY_EXTORTION:  "Corruption / Bribery / Extortion",
  DISCRIMINATION_BIAS:           "Discrimination / Bias",
  ACADEMIC_MALPRACTICE:          "Academic Malpractice",
  THEFT_PROPERTY_DAMAGE:         "Theft / Property Damage",
  OTHER_CRIME_POLICY_VIOLATION:  "Other / Policy Violation",
};

const URGENCY_CONFIG: Record<string, { label: string; cn: string; dot: string }> = {
  LOW:      { label: "Low",      cn: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  MEDIUM:   { label: "Medium",   cn: "bg-amber-50   text-amber-700   border-amber-200",   dot: "bg-amber-500"   },
  HIGH:     { label: "High",     cn: "bg-orange-50  text-orange-700  border-orange-200",  dot: "bg-orange-500"  },
  CRITICAL: { label: "Critical", cn: "bg-red-50     text-red-700     border-red-200",     dot: "bg-red-500"     },
};

const STATUS_CONFIG: Record<string, { label: string; cn: string }> = {
  PENDING:      { label: "Pending",      cn: "bg-amber-50   text-amber-700   border-amber-200"   },
  UNDER_REVIEW: { label: "Under Review", cn: "bg-blue-50    text-blue-700    border-blue-200"    },
  RESOLVED:     { label: "Resolved",     cn: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DISMISSED:    { label: "Dismissed",    cn: "bg-gray-100   text-gray-500    border-gray-200"    },
  DRAFT:        { label: "Draft",        cn: "bg-gray-100   text-gray-500    border-gray-200"    },
  DELETED:      { label: "Deleted",      cn: "bg-red-50     text-red-700     border-red-200"     },
};

const INSTITUTION_LABELS: Record<string, string> = {
  UNIVERSITY: "University",
  SCHOOL:     "School",
  COLLEGE:    "College",
  MADRASA:    "Madrasa",
  OTHERS:     "Others",
};

const UNIVERSITY_TYPE_LABELS: Record<string, string> = {
  PUBLIC:  "Public",
  PRIVATE: "Private",
  OTHERS:  "Others",
};

const ADMIN_STATUSES = ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;

// ─── Card color system ─────────────────────────────────────────────────────────

type CardVariant = "blue" | "amber" | "teal" | "violet" | "rose" | "orange" | "dark";

const CARD_VARIANTS: Record<
  CardVariant,
  { stripe: string; gradient: string; border: string; iconCn: string; titleCn: string }
> = {
  blue: {
    stripe:   "border-l-[4px] border-l-blue-400",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-500",
    border:   "border-b border-blue-600/20",
    iconCn:   "text-blue-100",
    titleCn:  "text-white",
  },
  amber: {
    stripe:   "border-l-[4px] border-l-amber-400",
    gradient: "bg-gradient-to-r from-amber-500 to-amber-400",
    border:   "border-b border-amber-600/20",
    iconCn:   "text-amber-100",
    titleCn:  "text-white",
  },
  teal: {
    stripe:   "border-l-[4px] border-l-teal-400",
    gradient: "bg-gradient-to-r from-teal-600 to-teal-500",
    border:   "border-b border-teal-600/20",
    iconCn:   "text-teal-100",
    titleCn:  "text-white",
  },
  violet: {
    stripe:   "border-l-[4px] border-l-violet-400",
    gradient: "bg-gradient-to-r from-violet-600 to-violet-500",
    border:   "border-b border-violet-600/20",
    iconCn:   "text-violet-100",
    titleCn:  "text-white",
  },
  rose: {
    stripe:   "border-l-[4px] border-l-rose-400",
    gradient: "bg-gradient-to-r from-rose-600 to-rose-500",
    border:   "border-b border-rose-600/20",
    iconCn:   "text-rose-100",
    titleCn:  "text-white",
  },
  orange: {
    stripe:   "border-l-[4px] border-l-orange-400",
    gradient: "bg-gradient-to-r from-orange-500 to-orange-400",
    border:   "border-b border-orange-600/20",
    iconCn:   "text-orange-100",
    titleCn:  "text-white",
  },
  dark: {
    stripe:   "border-l-[4px] border-l-[#e60000]",
    gradient: "bg-gradient-to-r from-[#1a1d1f] to-[#25282b]",
    border:   "border-b border-white/10",
    iconCn:   "text-white/50",
    titleCn:  "text-white",
  },
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  submission: SubmissionDetail;
  canDelete: boolean;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SubmissionDetailClient({ submission, canDelete }: Props) {
  const router = useRouter();

  const [currentStatus,   setCurrentStatus]      = useState(submission.status);
  const [selectedStatus,  setSelectedStatus]      = useState(submission.status);
  const [isPendingStatus, startStatusTransition]  = useTransition();
  const [updateError,     setUpdateError]         = useState<string | null>(null);
  const [updateSuccess,   setUpdateSuccess]       = useState(false);

  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [isPendingDelete, startDeleteTransition]  = useTransition();
  const [deleteError,     setDeleteError]         = useState<string | null>(null);

  const statusCfg  = STATUS_CONFIG[currentStatus]            ?? STATUS_CONFIG.PENDING;
  const urgencyCfg = URGENCY_CONFIG[submission.urgencyLevel] ?? URGENCY_CONFIG.LOW;
  const initials   = submission.submitter.name
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  function handleUpdateStatus() {
    if (selectedStatus === currentStatus) return;
    setUpdateError(null);
    setUpdateSuccess(false);
    startStatusTransition(async () => {
      const result = await updateStatus(submission.id, selectedStatus);
      if (result.success) {
        setCurrentStatus(selectedStatus);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 4000);
      } else {
        setUpdateError(result.error);
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteSubmission(submission.id);
      if (result.success) {
        router.push("/admin");
      } else {
        setDeleteError(result.error);
      }
    });
  }

  const hasAccused =
    submission.accusedName ||
    submission.accusedDetails ||
    submission.accusedFiles.length > 0 ||
    submission.accusedLinks.length > 0;

  const hasAdditional =
    submission.additionalName ||
    submission.additionalDetails ||
    submission.additionalFiles.length > 0 ||
    submission.additionalLinks.length > 0;

  return (
    <>
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm text-[#7e7e7e] hover:text-[#25282b] transition-colors"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-[#7e7e7e]">
              {submission.id.slice(0, 8)}…
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.cn}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ── Page ── */}
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-5">

        {/* ══ ROW 1: Submitter (3/5) + Incident + Admin Controls (2/5) ══ */}
        <div className="grid gap-5 lg:grid-cols-5">

          {/* ── Submitter — blue ── */}
          <Card variant="blue" icon={<UserCircle2 size={14} />} title="Submitter Information" className="lg:col-span-3">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow-sm">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-[#25282b] text-base leading-tight">
                  {submission.submitter.name}
                </p>
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-blue-700">
                  {submission.submitter.role === "TEACHER" ? "Teacher" : "Student"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              <Field label="Email" value={submission.submitter.email} />
              <Field label="Phone" value={submission.submitter.phone} />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <Building2 size={11} />
                Institution
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={submission.submitter.institutionName ?? "—"} />
                <Field
                  label="Type"
                  value={submission.submitter.institutionType ? (INSTITUTION_LABELS[submission.submitter.institutionType] ?? submission.submitter.institutionType) : "—"}
                />
                {submission.submitter.universityType && (
                  <Field
                    label="University Type"
                    value={UNIVERSITY_TYPE_LABELS[submission.submitter.universityType] ?? submission.submitter.universityType}
                  />
                )}
                {submission.submitter.department && (
                  <Field label="Department" value={submission.submitter.department} />
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <MapPin size={11} />
                Location
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Division" value={submission.submitter.division} />
                <Field label="District" value={submission.submitter.district} />
                <Field label="Upazila"  value={submission.submitter.upazila}  />
                {submission.submitter.specificAddress && (
                  <Field label="Address" value={submission.submitter.specificAddress} className="col-span-3" />
                )}
              </div>
            </div>
          </Card>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* ── Incident summary — amber ── */}
            <Card variant="amber" icon={<ShieldCheck size={14} />} title="Incident Summary">
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Category</p>
                  <span className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
                    {CATEGORY_LABELS[submission.category] ?? submission.category}
                  </span>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Urgency Level</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${urgencyCfg.cn}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${urgencyCfg.dot}`} />
                    {urgencyCfg.label}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Clock size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Submitted</p>
                      <p className="text-sm text-[#25282b]">
                        {new Date(submission.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Last Updated</p>
                      <p className="text-sm text-[#25282b]">
                        {new Date(submission.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Admin controls — dark ── */}
            <Card variant="dark" icon={<ShieldCheck size={14} />} title="Admin Controls" className="flex-1">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">Update Status</p>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      disabled={isPendingStatus}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-8 py-2.5 text-sm text-[#25282b] focus:border-[#e60000] focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 disabled:opacity-50"
                    >
                      {ADMIN_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]" />
                  </div>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={isPendingStatus || selectedStatus === currentStatus}
                    className="w-full rounded-xl bg-[#e60000] py-2.5 text-sm font-semibold text-white hover:bg-[#cc0000] disabled:opacity-40 transition-colors"
                  >
                    {isPendingStatus ? "Saving…" : "Update Status"}
                  </button>
                  {updateSuccess && (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <CheckCircle2 size={13} /> Status updated successfully
                    </p>
                  )}
                  {updateError && <p className="text-xs text-red-400">{updateError}</p>}
                </div>

                {canDelete && (
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Danger Zone</p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Submission
                    </button>
                  </div>
                )}
              </div>
            </Card>

          </div>
        </div>

        {/* ══ ROW 2: Description — teal ══ */}
        <Card variant="teal" icon={<StickyNote size={14} />} title="Description">
          {submission.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#25282b]">
              {submission.description}
            </p>
          ) : (
            <p className="text-sm italic text-[#7e7e7e]">No description provided.</p>
          )}
        </Card>

        {/* ══ ROW 3: Evidence — violet ══ */}
        {(submission.evidenceFiles.length > 0 || submission.links.length > 0) && (
          <Card variant="violet" icon={<Paperclip size={14} />} title="Evidence">
            <div className="space-y-5">
              {submission.evidenceFiles.length > 0 && (
                <div>
                  <SectionLabel>Files</SectionLabel>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {submission.evidenceFiles.map((f) => <FileCard key={f.id} file={f} />)}
                  </div>
                </div>
              )}
              {submission.links.length > 0 && (
                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="mt-2 space-y-1.5">
                    {submission.links.map((url, i) => <LinkRow key={i} url={url} />)}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ══ ROW 4: Accused Information — rose ══ */}
        <Card variant="rose" icon={<Users size={14} />} title="Accused Information">
          {hasAccused ? (
            <div className="space-y-5">
              {(submission.accusedName || submission.accusedDetails) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {submission.accusedName && <Field label="Name" value={submission.accusedName} />}
                  {submission.accusedDetails && (
                    <div className="sm:col-span-2">
                      <Field label="Details" value={submission.accusedDetails} />
                    </div>
                  )}
                </div>
              )}
              {submission.accusedFiles.length > 0 && (
                <div>
                  <SectionLabel>Evidence Files</SectionLabel>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {submission.accusedFiles.map((f) => <FileCard key={f.id} file={f} />)}
                  </div>
                </div>
              )}
              {submission.accusedLinks.length > 0 && (
                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="mt-2 space-y-1.5">
                    {submission.accusedLinks.map((url, i) => <LinkRow key={i} url={url} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-[#7e7e7e]">No accused information provided.</p>
          )}
        </Card>

        {/* ══ ROW 5: Additional Responsible — orange ══ */}
        <Card variant="orange" icon={<UserCircle2 size={14} />} title="Additional Responsible Party">
          {hasAdditional ? (
            <div className="space-y-5">
              {(submission.additionalName || submission.additionalDetails) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {submission.additionalName && <Field label="Name" value={submission.additionalName} />}
                  {submission.additionalDetails && (
                    <div className="sm:col-span-2">
                      <Field label="Details" value={submission.additionalDetails} />
                    </div>
                  )}
                </div>
              )}
              {submission.additionalFiles.length > 0 && (
                <div>
                  <SectionLabel>Evidence Files</SectionLabel>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {submission.additionalFiles.map((f) => <FileCard key={f.id} file={f} />)}
                  </div>
                </div>
              )}
              {submission.additionalLinks.length > 0 && (
                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="mt-2 space-y-1.5">
                    {submission.additionalLinks.map((url, i) => <LinkRow key={i} url={url} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-[#7e7e7e]">No additional party information provided.</p>
          )}
        </Card>

      </main>

      {/* ── Delete modal ── */}
      {canDelete && showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPendingDelete && setShowDeleteModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-[#e60000]" />
            <div className="px-6 py-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="text-[#e60000]" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#25282b]">Delete Submission</h3>
                  <p className="mt-1.5 text-sm text-[#7e7e7e] leading-relaxed">
                    This will permanently delete all data and files.{" "}
                    <strong className="text-[#25282b]">This cannot be undone.</strong>
                  </p>
                </div>
              </div>
              {deleteError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isPendingDelete}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-[#25282b] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  className="flex-1 rounded-xl bg-[#e60000] py-2.5 text-sm font-bold text-white hover:bg-[#cc0000] disabled:opacity-50 transition-colors"
                >
                  {isPendingDelete ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function Card({
  variant, icon, title, children, className = "",
}: {
  variant:    CardVariant;
  icon:       React.ReactNode;
  title:      string;
  children:   React.ReactNode;
  className?: string;
}) {
  const v = CARD_VARIANTS[variant];
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm ${v.stripe} ${className}`}>
      {/* Colored gradient header */}
      <div className={`flex items-center gap-2.5 px-5 py-3.5 ${v.gradient} ${v.border}`}>
        <span className={`shrink-0 ${v.iconCn}`}>{icon}</span>
        <h2 className={`text-[11px] font-extrabold uppercase tracking-[0.12em] ${v.titleCn}`}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, className = "" }: {
  label:      string;
  value:      string | null | undefined;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">{label}</dt>
      <dd className="text-sm text-[#25282b] break-words">{value || "—"}</dd>
    </div>
  );
}

// ─── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7e7e7e]">{children}</p>
  );
}

// ─── FileCard ──────────────────────────────────────────────────────────────────

function FileCard({ file }: { file: DecryptedFile }) {
  const isImage = file.fileType.startsWith("image/");
  const isVideo = file.fileType.startsWith("video/");
  const isPDF   = file.fileType === "application/pdf";
  const canPreview = isImage || isVideo || isPDF;

  const iconStyle =
    isImage ? "bg-blue-50   text-blue-500"   :
    isVideo ? "bg-purple-50 text-purple-500"  :
    isPDF   ? "bg-red-50    text-red-500"     :
              "bg-gray-100  text-gray-500";

  const Icon = isImage ? ImageIcon : isVideo ? VideoIcon : isPDF ? FileTextIcon : Paperclip;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3 hover:border-gray-200 hover:bg-white transition-colors">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#25282b] truncate" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="text-xs text-[#7e7e7e]">{formatSize(file.fileSize)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {canPreview && (
          <a href={`/api/admin/download/${file.id}?inline=1`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-semibold text-[#e60000] hover:underline">
            Preview
          </a>
        )}
        <a href={`/api/admin/download/${file.id}`} download
          className="text-[11px] font-semibold text-[#e60000] hover:underline">
          Download
        </a>
      </div>
    </div>
  );
}

// ─── LinkRow ───────────────────────────────────────────────────────────────────

function LinkRow({ url }: { url: string }) {
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-[#e60000] hover:border-gray-200 hover:bg-white transition-colors">
      <Link2 size={13} className="shrink-0 text-[#7e7e7e]" />
      <span className="truncate">{url}</span>
    </a>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
