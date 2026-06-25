"use client";

import {
  useState,
  useRef,
  useEffect,
  useTransition,
} from "react";
import {
  Plus,
  Trash2,
  X,
  Upload,
  Video,
  Copy,
  Check,
  Paperclip,
} from "lucide-react";
import { submitReport, saveDraft } from "@/app/(protected)/report/actions";
import type { FileMetadata } from "@/app/(protected)/report/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile extends FileMetadata {
  displayName: string;
  previewUrl?: string;
}

interface UploadedFileResult {
  key: string;
  fileIV: string;
  fileTag: string;
  encryptedOriginalName: string;
  nameIV: string;
  nameTag: string;
  mimeType: string;
  fileSize: number;
}

interface AdditionalParty {
  id: string;
  name: string;
  details: string;
  files: UploadedFile[];
  fileUploading: boolean;
  videoFile: UploadedFile | null;
  videoProgress: number;
  videoUploading: boolean;
  links: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: string; label: string }[] = [
  { value: "HARASSMENT_BULLYING",            label: "হয়রানি / ধমক (Harassment / Bullying)" },
  { value: "BLACKMAIL_THREATS",              label: "ব্ল্যাকমেইল / হুমকি (Blackmail / Threats)" },
  { value: "CORRUPTION_BRIBERY_EXTORTION",   label: "দুর্নীতি, ঘুষ ও চাঁদাবাজি (Corruption, Bribery & Extortion)" },
  { value: "DISCRIMINATION_BIAS",            label: "বৈষম্য / পক্ষপাত (Discrimination / Bias)" },
  { value: "ACADEMIC_MALPRACTICE",           label: "একাডেমিক অসদাচরণ (Academic Malpractice)" },
  { value: "EXPULSION_DISMISSAL",            label: "বহিষ্কার (Expulsion / Dismissal)" },
  { value: "SUSPENSION_RELIEF",              label: "অব্যাহতি / সাময়িক বরখাস্ত (Suspension / Relief from Duty)" },
  { value: "THEFT_PROPERTY_DAMAGE",          label: "চুরি / সম্পত্তি ক্ষতি (Theft / Property Damage)" },
  { value: "OTHER_CRIME_POLICY_VIOLATION",   label: "অন্যান্য অপরাধ / নীতি লঙ্ঘন (Other Crime / Policy Violation)" },
];

const URGENCY_LEVELS: { value: string; label: string; dot: string }[] = [
  { value: "LOW",      label: "কম (Low)",         dot: "bg-green-500" },
  { value: "MEDIUM",   label: "মাঝারি (Medium)",  dot: "bg-yellow-500" },
  { value: "HIGH",     label: "উচ্চ (High)",      dot: "bg-orange-500" },
  { value: "CRITICAL", label: "জরুরি (Critical)", dot: "bg-[#e60000]" },
];

const REGULAR_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain";
const VIDEO_ACCEPT   = "video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mpeg";
const MAX_DESC_CHARS = 5000;
const MAX_LINKS      = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fieldInput =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#25282b] " +
  "placeholder:text-gray-400 transition-all focus:border-[#e60000] focus:bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// ─── FileDropZone ─────────────────────────────────────────────────────────────

function FileDropZone({
  files, onFilesAdd, onFileRemove, onUploadingChange,
  accept, maxFiles, maxSizeBytes, label, sublabel,
}: {
  files: UploadedFile[];
  onFilesAdd: (files: UploadedFile[]) => void;
  onFileRemove: (index: number) => void;
  onUploadingChange: (v: boolean) => void;
  accept: string;
  maxFiles: number;
  maxSizeBytes: number;
  label: string;
  sublabel: string;
}) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [dragOn,    setDragOn]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localErr,  setLocalErr]  = useState<string | null>(null);

  async function processFiles(list: FileList) {
    const selected = Array.from(list);
    if (!selected.length) return;

    if (files.length + selected.length > maxFiles) {
      setLocalErr(`সর্বোচ্চ ${maxFiles}টি ফাইল আপলোড করা যাবে।`);
      return;
    }

    const acceptedTypes = new Set(accept.split(",").map((s) => s.trim()));
    const badType = selected.find((f) => !acceptedTypes.has(f.type));
    if (badType) {
      setLocalErr(`"${badType.name}" গ্রহণযোগ্য ফাইল ধরন নয়।`);
      return;
    }

    const tooLarge = selected.find((f) => f.size > maxSizeBytes);
    if (tooLarge) {
      setLocalErr(`"${tooLarge.name}" সর্বোচ্চ ${formatBytes(maxSizeBytes)} সীমা অতিক্রম করেছে।`);
      return;
    }

    setLocalErr(null);
    setUploading(true);
    onUploadingChange(true);

    try {
      const fd = new FormData();
      selected.forEach((f) => fd.append("file", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "আপলোড ব্যর্থ হয়েছে।");
      }
      const data = (await res.json()) as { files: UploadedFileResult[] };
      const uploaded: UploadedFile[] = data.files.map((r, i) => ({
        ...r,
        displayName: selected[i]?.name ?? "unnamed",
        previewUrl:
          selected[i]?.type.startsWith("image/")
            ? URL.createObjectURL(selected[i])
            : undefined,
      }));
      onFilesAdd(uploaded);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "আপলোড ব্যর্থ হয়েছে।");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div>
      <div
        role="button" tabIndex={0} aria-label={label}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragOn
            ? "border-[#e60000] bg-[#e60000]/5"
            : "border-gray-200 hover:border-[#e60000]/40 hover:bg-gray-50",
          uploading && "pointer-events-none opacity-60"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e)  => { e.preventDefault(); setDragOn(true); }}
        onDragLeave={()  => setDragOn(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOn(false);
          if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef} type="file" multiple accept={accept} className="sr-only"
          onChange={(e) => { if (e.target.files) { processFiles(e.target.files); e.target.value = ""; } }}
        />
        <Upload
          size={22}
          className={cn("shrink-0", dragOn ? "text-[#e60000]" : "text-gray-400")}
        />
        {uploading ? (
          <p className="text-sm text-[#7e7e7e]">আপলোড হচ্ছে…</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#25282b]">{label}</p>
            <p className="text-xs text-[#7e7e7e]">{sublabel}</p>
          </>
        )}
      </div>

      {localErr && (
        <p role="alert" className="mt-1.5 text-xs text-[#e60000]">{localErr}</p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, idx) => (
            <li key={f.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              {f.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.previewUrl} alt={f.displayName} className="h-10 w-10 rounded-md object-cover shrink-0" />
              ) : (
                <Paperclip size={16} className="shrink-0 text-gray-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#25282b]">{f.displayName}</p>
                <p className="text-xs text-[#7e7e7e]">{formatBytes(f.fileSize)}</p>
              </div>
              <button
                type="button" onClick={() => onFileRemove(idx)}
                aria-label={`Remove ${f.displayName}`}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-[#e60000] transition-colors"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── VideoDropZone ────────────────────────────────────────────────────────────

function VideoDropZone({
  file, onFileSet, onUploadingChange, progress, onProgressChange,
}: {
  file: UploadedFile | null;
  onFileSet: (file: UploadedFile | null) => void;
  onUploadingChange: (v: boolean) => void;
  progress: number;
  onProgressChange: (pct: number) => void;
}) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const xhrRef      = useRef<XMLHttpRequest | null>(null);
  const [dragOn,    setDragOn]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localErr,  setLocalErr]  = useState<string | null>(null);

  function startUpload(selectedFile: File) {
    if (!selectedFile.type.startsWith("video/")) {
      setLocalErr("শুধুমাত্র ভিডিও ফাইল গ্রহণযোগ্য।"); return;
    }
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setLocalErr("ভিডিও ২ জিবি সীমা অতিক্রম করেছে।"); return;
    }
    setLocalErr(null); setUploading(true); onUploadingChange(true); onProgressChange(0);
    const fd = new FormData();
    fd.append("file", selectedFile);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgressChange(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      xhrRef.current = null; setUploading(false); onUploadingChange(false);
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText) as { files?: UploadedFileResult[] };
          const result = data.files?.[0];
          if (!result) throw new Error("Unexpected response.");
          onFileSet({ ...result, displayName: selectedFile.name });
        } catch {
          setLocalErr("আপলোডের প্রতিক্রিয়া অবৈধ।");
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          setLocalErr(data.error ?? "আপলোড ব্যর্থ হয়েছে।");
        } catch {
          setLocalErr("আপলোড ব্যর্থ হয়েছে।");
        }
      }
    };
    xhr.onerror = () => { xhrRef.current = null; setUploading(false); onUploadingChange(false); setLocalErr("আপলোডের সময় নেটওয়ার্ক সমস্যা হয়েছে।"); };
    xhr.onabort = () => { xhrRef.current = null; setUploading(false); onUploadingChange(false); onProgressChange(0); };
    xhr.open("POST", "/api/upload");
    xhr.send(fd);
  }

  function handleCancel() { xhrRef.current?.abort(); onFileSet(null); onProgressChange(0); }

  return (
    <div>
      {!file && !uploading && (
        <div
          role="button" tabIndex={0} aria-label="Upload video"
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOn
              ? "border-[#e60000] bg-[#e60000]/5"
              : "border-gray-200 hover:border-[#e60000]/40 hover:bg-gray-50"
          )}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOn(true); }}
          onDragLeave={() => setDragOn(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOn(false);
            const f = e.dataTransfer.files[0]; if (f) startUpload(f);
          }}
        >
          <input
            ref={inputRef} type="file" accept={VIDEO_ACCEPT} className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { startUpload(f); e.target.value = ""; } }}
          />
          <Video size={22} className={cn("shrink-0", dragOn ? "text-[#e60000]" : "text-gray-400")} />
          <p className="text-sm font-semibold text-[#25282b]">ভিডিও টেনে আনুন বা ক্লিক করুন</p>
          <p className="text-xs text-[#7e7e7e]">MP4, MOV, AVI, WebM · সর্বোচ্চ ২ জিবি · ১টি ভিডিও</p>
        </div>
      )}

      {uploading && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#25282b]">ভিডিও আপলোড হচ্ছে… {progress}%</p>
            <button type="button" onClick={handleCancel}
              className="text-xs text-[#7e7e7e] hover:text-[#e60000] transition-colors">
              বাতিল
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-[#e60000] transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {file && !uploading && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
          <Video size={18} className="shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#25282b]">{file.displayName}</p>
            <p className="text-xs text-[#7e7e7e]">{formatBytes(file.fileSize)}</p>
          </div>
          <button type="button" onClick={() => onFileSet(null)} aria-label="Remove video"
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-[#e60000] transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {localErr && <p role="alert" className="mt-1.5 text-xs text-[#e60000]">{localErr}</p>}
    </div>
  );
}

// ─── LinksList ────────────────────────────────────────────────────────────────

function LinksList({ links, onChange }: { links: string[]; onChange: (links: string[]) => void }) {
  function update(index: number, value: string) { const next = [...links]; next[index] = value; onChange(next); }
  function remove(index: number) { onChange(links.filter((_, i) => i !== index)); }
  function add() { if (links.length < MAX_LINKS) onChange([...links, ""]); }

  return (
    <div className="space-y-2">
      {links.map((url, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="url" value={url} onChange={(e) => update(idx, e.target.value)}
            placeholder="https://example.com/evidence"
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#25282b] placeholder:text-gray-400 transition-all focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/15"
          />
          <button type="button" onClick={() => remove(idx)} aria-label="Remove link"
            className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-[#e60000] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {links.length < MAX_LINKS && (
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#e60000] hover:underline">
          <Plus size={13} />
          লিঙ্ক যোগ করুন
        </button>
      )}
    </div>
  );
}

// ─── SuccessModal ─────────────────────────────────────────────────────────────

function SuccessModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true" role="dialog" aria-labelledby="success-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-8 shadow-2xl">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto">
          <Check size={24} className="text-green-600" />
        </div>
        <h2 id="success-title" className="text-center text-xl font-black text-[#25282b]">
          রিপোর্ট জমা হয়েছে!
        </h2>
        <p className="text-center text-xs text-[#7e7e7e]">Report submitted</p>
        <p className="mt-2 text-center text-sm text-[#7e7e7e]">
          আপনার রিপোর্ট গৃহীত ও সুরক্ষিতভাবে সংরক্ষিত হয়েছে। নিচের রেফারেন্স আইডিটি সংরক্ষণ করুন।
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <code className="flex-1 truncate font-mono text-xs text-[#25282b]">{id}</code>
          <button type="button" onClick={copy} aria-label="Copy report ID"
            className="shrink-0 rounded p-1 text-gray-400 hover:text-[#25282b] transition-colors">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
        </div>

        <button
          type="button" onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[#e60000] px-4 py-3 text-sm font-bold text-white hover:bg-[#cc0000] transition-colors"
        >
          আরেকটি রিপোর্ট জমা দিন
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  number, title, titleBn, children, evidenceRequired, evidenceSatisfied,
}: {
  number: string;
  title: string;
  titleBn?: string;
  children: React.ReactNode;
  evidenceRequired?: boolean;
  evidenceSatisfied?: boolean;
}) {
  return (
    <section className={cn(
      "rounded-2xl border bg-white overflow-hidden",
      evidenceRequired && !evidenceSatisfied ? "border-gray-200" : "border-gray-200"
    )}>
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
        <span className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white",
          evidenceRequired && evidenceSatisfied ? "bg-green-500" : "bg-[#e60000]"
        )}>
          {evidenceRequired && evidenceSatisfied ? "✓" : number}
        </span>
        <h2 className="flex-1 text-base font-bold text-[#25282b]">
          {titleBn ?? title}
          {titleBn && <span className="ml-2 text-xs font-normal text-[#7e7e7e]">({title})</span>}
        </h2>
        {evidenceRequired && (
          <span className={cn(
            "text-[11px] font-semibold",
            evidenceSatisfied ? "text-green-600" : "text-[#e60000]"
          )}>
            {evidenceSatisfied ? "প্রমাণ যোগ হয়েছে ✓" : "অন্তত ১টি প্রমাণ আবশ্যক *"}
          </span>
        )}
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </section>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, labelBn, id, required, children }: { label: string; labelBn?: string; id: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-[#25282b]">
        {labelBn ?? label}
        {labelBn && (
          <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">({label})</span>
        )}
        {required && <span className="ml-0.5 text-[#e60000]">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── AdditionalPartyCard ─────────────────────────────────────────────────────

function AdditionalPartyCard({
  party, index, onRemove, onUpdate,
}: {
  party: AdditionalParty;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<AdditionalParty>) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-400 text-[11px] font-black text-white">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-bold text-[#25282b]">
          অতিরিক্ত দায়ী ব্যক্তি {index + 1}
          <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">(Additional Party {index + 1})</span>
        </span>
        <button
          type="button" onClick={onRemove}
          aria-label={`Remove party ${index + 1}`}
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#e60000] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <Field label="Name" labelBn="নাম" id={`ap-name-${party.id}`}>
          <input
            id={`ap-name-${party.id}`} type="text" value={party.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="অতিরিক্ত দায়ী ব্যক্তির পূর্ণ নাম (ঐচ্ছিক)"
            className={fieldInput}
          />
        </Field>

        <Field label="Role / Details" labelBn="পদবি / বিবরণ" id={`ap-details-${party.id}`}>
          <textarea
            id={`ap-details-${party.id}`} rows={3} value={party.details}
            onChange={(e) => onUpdate({ details: e.target.value })}
            placeholder="পদবি, বিভাগ বা অন্যান্য পরিচয়মূলক তথ্য (ঐচ্ছিক)"
            className={`${fieldInput} resize-y`}
          />
        </Field>

        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
            প্রমাণ <span className="normal-case font-normal">(Evidence)</span>
          </p>
          <FileDropZone
            files={party.files}
            onFilesAdd={(added) => onUpdate({ files: [...party.files, ...added] })}
            onFileRemove={(idx) => onUpdate({ files: party.files.filter((_, i) => i !== idx) })}
            onUploadingChange={(v) => onUpdate({ fileUploading: v })}
            accept={REGULAR_ACCEPT} maxFiles={5} maxSizeBytes={20 * 1024 * 1024}
            label="ফাইল টেনে আনুন বা ক্লিক করুন (Drop files or click to browse)"
            sublabel="ছবি, PDF, TXT · সর্বোচ্চ ৫টি · প্রতিটি ২০ মেগাবাইট"
          />
        </div>

        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
            ভিডিও প্রমাণ <span className="normal-case font-normal">(Video Evidence)</span>
          </p>
          <VideoDropZone
            file={party.videoFile}
            onFileSet={(f) => onUpdate({ videoFile: f })}
            onUploadingChange={(v) => onUpdate({ videoUploading: v })}
            progress={party.videoProgress}
            onProgressChange={(p) => onUpdate({ videoProgress: p })}
          />
        </div>

        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
            লিঙ্ক <span className="normal-case font-normal">(Links)</span>
          </p>
          <LinksList links={party.links} onChange={(ls) => onUpdate({ links: ls })} />
        </div>
      </div>
    </div>
  );
}

// ─── ReportForm ───────────────────────────────────────────────────────────────

export function ReportForm() {
  const [category,    setCategory]    = useState("");
  const [urgency,     setUrgency]     = useState("");
  const [description, setDescription] = useState("");

  const [evidenceFiles,      setEvidenceFiles]      = useState<UploadedFile[]>([]);
  const [evidenceUploading,  setEvidenceUploading]  = useState(false);
  const [videoFile,          setVideoFile]          = useState<UploadedFile | null>(null);
  const [videoProgress,      setVideoProgress]      = useState(0);
  const [videoUploading,     setVideoUploading]     = useState(false);
  const [links,              setLinks]              = useState<string[]>([""]);

  const [accusedName,           setAccusedName]           = useState("");
  const [accusedDetails,        setAccusedDetails]        = useState("");
  const [accusedFiles,          setAccusedFiles]          = useState<UploadedFile[]>([]);
  const [accusedUploading,      setAccusedUploading]      = useState(false);
  const [accusedVideoFile,      setAccusedVideoFile]      = useState<UploadedFile | null>(null);
  const [accusedVideoProgress,  setAccusedVideoProgress]  = useState(0);
  const [accusedVideoUploading, setAccusedVideoUploading] = useState(false);
  const [accusedLinks,          setAccusedLinks]          = useState<string[]>([""]);

  const [additionalParties, setAdditionalParties] = useState<AdditionalParty[]>([]);

  const [isPending,  startTransition] = useTransition();
  const [error,      setError]        = useState<string | null>(null);
  const [successId,  setSuccessId]    = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const hasChanges =
    !!(category || urgency || description ||
       evidenceFiles.length || videoFile ||
       links.some((l) => l.trim()) ||
       accusedName || accusedDetails ||
       accusedFiles.length || accusedVideoFile ||
       accusedLinks.some((l) => l.trim()) ||
       additionalParties.some((p) =>
         p.name || p.details || p.files.length || p.videoFile || p.links.some((l) => l.trim())
       ));

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges && !successId) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges, successId]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const anyUploading =
    evidenceUploading || videoUploading ||
    accusedUploading || accusedVideoUploading ||
    additionalParties.some((p) => p.fileUploading || p.videoUploading);

  function addEvidenceFiles(added: UploadedFile[]) { setEvidenceFiles((prev) => [...prev, ...added]); }
  function removeEvidenceFile(idx: number)          { setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx)); }
  function addAccusedFiles(added: UploadedFile[])   { setAccusedFiles((prev) => [...prev, ...added]); }
  function removeAccusedFile(idx: number)           { setAccusedFiles((prev) => prev.filter((_, i) => i !== idx)); }

  function addParty() {
    setAdditionalParties((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "", details: "",
        files: [], fileUploading: false,
        videoFile: null, videoProgress: 0, videoUploading: false,
        links: [""],
      },
    ]);
  }

  function removeParty(id: string) {
    setAdditionalParties((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParty(id: string, patch: Partial<AdditionalParty>) {
    setAdditionalParties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  function buildPayload() {
    const apNames   = additionalParties.map((p) => p.name.trim()).filter(Boolean);
    const apDetails = additionalParties.map((p) => p.details.trim()).filter(Boolean);
    const apFiles   = additionalParties.flatMap((p) => p.files.map(toMeta));
    const apLinks   = additionalParties.flatMap((p) => p.links.filter((l) => l.trim()));
    const apVideo   = additionalParties.find((p) => p.videoFile)?.videoFile ?? null;

    return {
      category,
      urgencyLevel:        urgency,
      description,
      evidenceFiles:       evidenceFiles.map(toMeta),
      videoFile:           videoFile ? toMeta(videoFile) : undefined,
      links:               links.filter((l) => l.trim()),
      accusedName:         accusedName.trim() || undefined,
      accusedDetails:      accusedDetails.trim() || undefined,
      accusedFiles:        accusedFiles.map(toMeta),
      accusedVideoFile:    accusedVideoFile ? toMeta(accusedVideoFile) : undefined,
      accusedLinks:        accusedLinks.filter((l) => l.trim()),
      additionalName:      apNames.join(" | ") || undefined,
      additionalDetails:   apDetails.join("\n\n---\n\n") || undefined,
      additionalFiles:     apFiles,
      additionalVideoFile: apVideo ? toMeta(apVideo) : undefined,
      additionalLinks:     apLinks,
    };
  }

  function resetForm() {
    setCategory(""); setUrgency(""); setDescription("");
    setEvidenceFiles([]); setVideoFile(null); setVideoProgress(0); setLinks([""]);
    setAccusedName(""); setAccusedDetails(""); setAccusedFiles([]);
    setAccusedVideoFile(null); setAccusedVideoProgress(0); setAccusedLinks([""]);
    setAdditionalParties([]);
    setError(null); setSuccessId(null);
  }

  const hasEvidenceEvidence =
    evidenceFiles.length > 0 || videoFile !== null || links.some((l) => l.trim());

  const hasAccusedEvidence =
    accusedFiles.length > 0 || accusedVideoFile !== null || accusedLinks.some((l) => l.trim());

  function clientValidate(): string | null {
    if (!category)           return "একটি বিভাগ নির্বাচন করুন।";
    if (!urgency)            return "জরুরীের স্তর নির্বাচন করুন।";
    if (!description.trim()) return "বিবরণ লেখা আবশ্যক।";
    if (description.length > MAX_DESC_CHARS)
      return `বিবরণ সর্বোচ্চ ${MAX_DESC_CHARS} অক্ষর হতে পারবে।`;
    if (!hasEvidenceEvidence)
      return "আপনার প্রমাণ বিভাগে অন্তত একটি প্রমাণ যোগ করুন (ফাইল, ভিডিও বা লিঙ্ক)।";
    if (!hasAccusedEvidence)
      return "অভিযুক্তের তথ্য বিভাগে অন্তত একটি প্রমাণ যোগ করুন (ফাইল, ভিডিও বা লিঙ্ক)।";
    return null;
  }

  function handleSubmit() {
    const validErr = clientValidate();
    if (validErr) { setError(validErr); return; }
    setError(null);
    startTransition(async () => {
      const result = await submitReport(buildPayload());
      if (!result.success) { setError(result.error); return; }
      setSuccessId(result.submissionId);
    });
  }

  function handleDraft() {
    setError(null);
    startTransition(async () => {
      const result = await saveDraft(buildPayload());
      if (!result.success) { setError(result.error); return; }
      setSuccessId(result.submissionId);
    });
  }

  return (
    <>
      {successId && <SuccessModal id={successId} onClose={resetForm} />}

      <div className="space-y-5">

        {/* Global error */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-xl border border-[#e60000]/20 bg-[#e60000]/5 px-4 py-3 text-sm text-[#e60000]"
          >
            {error}
          </div>
        )}

        {/* ── Section 1: Incident Details & Evidence ────────────────────── */}
        <Section number="1" title="Incident Details & Evidence" titleBn="ঘটনার বিবরণ ও প্রমাণ"
          evidenceRequired evidenceSatisfied={hasEvidenceEvidence}>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" labelBn="বিভাগ" id="category" required>
              <select
                id="category" value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={fieldInput}
              >
                <option value="">বিভাগ নির্বাচন করুন…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Urgency" labelBn="জরুরী" id="urgency" required>
              <select
                id="urgency" value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className={fieldInput}
              >
                <option value="">জরুরী নির্বাচন করুন…</option>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {urgency && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  urgency === "CRITICAL" ? "bg-[#e60000]/10 text-[#e60000]" :
                  urgency === "HIGH"     ? "bg-orange-100 text-orange-700" :
                  urgency === "MEDIUM"   ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full",
                  URGENCY_LEVELS.find(u => u.value === urgency)?.dot
                )} />
                {URGENCY_LEVELS.find(u => u.value === urgency)?.label}
              </span>
            </div>
          )}

          <Field label="Description" labelBn="বিবরণ" id="description" required>
            <>
              <textarea
                id="description" rows={7} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="কী ঘটেছে, কখন, কে জড়িত এবং প্রাসঙ্গিক তথ্য বিস্তারিত লিখুন…"
                maxLength={MAX_DESC_CHARS}
                className={`${fieldInput} resize-y`}
              />
              <p className={cn(
                "text-right text-xs",
                description.length > MAX_DESC_CHARS * 0.9 ? "text-[#e60000]" : "text-[#7e7e7e]"
              )}>
                {description.length} / {MAX_DESC_CHARS}
              </p>
            </>
          </Field>

          <div className="border-t border-gray-100 pt-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
              আপনার প্রমাণ <span className="normal-case font-normal">(Your Evidence)</span>
            </p>

            <div className="space-y-5">
              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
                  নথি ও ছবি <span className="normal-case font-normal">(Documents &amp; Images)</span>
                </p>
                <FileDropZone
                  files={evidenceFiles} onFilesAdd={addEvidenceFiles}
                  onFileRemove={removeEvidenceFile} onUploadingChange={setEvidenceUploading}
                  accept={REGULAR_ACCEPT} maxFiles={5} maxSizeBytes={20 * 1024 * 1024}
                  label="ফাইল টেনে আনুন বা ক্লিক করুন (Drop files or click to browse)"
                  sublabel="ছবি, PDF, TXT · সর্বোচ্চ ৫টি · প্রতিটি ২০ মেগাবাইট"
                />
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
                  ভিডিও প্রমাণ <span className="normal-case font-normal">(Video Evidence)</span>
                </p>
                <VideoDropZone
                  file={videoFile} onFileSet={setVideoFile}
                  onUploadingChange={setVideoUploading}
                  progress={videoProgress} onProgressChange={setVideoProgress}
                />
              </div>

              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
                  প্রমাণের লিঙ্ক <span className="normal-case font-normal">(Evidence Links)</span>
                </p>
                <LinksList links={links} onChange={setLinks} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 2: Accused Information ────────────────────────────── */}
        <Section number="2" title="Accused Information" titleBn="অভিযুক্তের তথ্য"
          evidenceRequired evidenceSatisfied={hasAccusedEvidence}>
          <p className="text-xs text-[#7e7e7e]">
            এই বিভাগের সব তথ্য ঐচ্ছিক, তবে পর্যালোচনা দলকে সাহায্য করে।
            <span className="ml-1 text-[11px]">(All fields optional but help the review team.)</span>
          </p>

          <Field label="Accused Name" labelBn="অভিযুক্তের নাম" id="accusedName">
            <input
              id="accusedName" type="text" value={accusedName}
              onChange={(e) => setAccusedName(e.target.value)}
              placeholder="অভিযুক্তের পূর্ণ নাম (ঐচ্ছিক)"
              className={fieldInput}
            />
          </Field>

          <Field label="Role / Details" labelBn="পদবি / বিবরণ" id="accusedDetails">
            <textarea
              id="accusedDetails" rows={3} value={accusedDetails}
              onChange={(e) => setAccusedDetails(e.target.value)}
              placeholder="পদবি, বিভাগ বা অন্যান্য পরিচয়মূলক তথ্য (ঐচ্ছিক)"
              className={`${fieldInput} resize-y`}
            />
          </Field>

          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
              অভিযুক্তের বিরুদ্ধে প্রমাণ <span className="normal-case font-normal">(Evidence Against Accused)</span>
            </p>
            <FileDropZone
              files={accusedFiles} onFilesAdd={addAccusedFiles}
              onFileRemove={removeAccusedFile} onUploadingChange={setAccusedUploading}
              accept={REGULAR_ACCEPT} maxFiles={5} maxSizeBytes={20 * 1024 * 1024}
              label="ফাইল টেনে আনুন বা ক্লিক করুন (Drop files or click to browse)"
              sublabel="ছবি, PDF, TXT · সর্বোচ্চ ৫টি · প্রতিটি ২০ মেগাবাইট"
            />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
              অভিযুক্তের বিরুদ্ধে ভিডিও প্রমাণ <span className="normal-case font-normal">(Video Evidence Against Accused)</span>
            </p>
            <VideoDropZone
              file={accusedVideoFile} onFileSet={setAccusedVideoFile}
              onUploadingChange={setAccusedVideoUploading}
              progress={accusedVideoProgress} onProgressChange={setAccusedVideoProgress}
            />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#7e7e7e]">
              লিঙ্ক <span className="normal-case font-normal">(Links)</span>
            </p>
            <LinksList links={accusedLinks} onChange={setAccusedLinks} />
          </div>
        </Section>

        {/* ── Section 3: Additional Responsible Parties ─────────────────── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-black text-white">
              3
            </span>
            <span className="flex-1 text-base font-bold text-[#25282b]">
              অতিরিক্ত দায়ী ব্যক্তি
              <span className="ml-2 text-xs font-normal text-[#7e7e7e]">(Additional Responsible Parties)</span>
            </span>
            <span className="text-xs text-[#7e7e7e]">ঐচ্ছিক (optional)</span>
          </div>

          <div className="px-6 py-5 space-y-4">
            {additionalParties.length === 0 && (
              <p className="text-sm text-[#7e7e7e]">
                যদি একাধিক ব্যক্তি এই ঘটনার জন্য দায়ী হন, তাদের তথ্য নিচে যোগ করুন।
                <span className="ml-1 text-xs">(If multiple people are responsible, add each one below.)</span>
              </p>
            )}

            {additionalParties.map((party, idx) => (
              <AdditionalPartyCard
                key={party.id}
                party={party}
                index={idx}
                onRemove={() => removeParty(party.id)}
                onUpdate={(patch) => updateParty(party.id, patch)}
              />
            ))}

            <button
              type="button" onClick={addParty}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-[#7e7e7e] transition-colors hover:border-[#e60000] hover:text-[#e60000]"
            >
              <Plus size={15} />
              আরেকটি দায়ী ব্যক্তি যোগ করুন (Add Another Party)
            </button>
          </div>
        </section>

        {/* ── Submit buttons ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button" onClick={handleDraft}
            disabled={isPending || anyUploading}
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-[#25282b] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "সংরক্ষণ হচ্ছে…" : "খসড়া হিসেবে সংরক্ষণ করুন"}
          </button>
          <button
            type="button" onClick={handleSubmit}
            disabled={isPending || anyUploading}
            className="rounded-lg bg-[#e60000] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {anyUploading
              ? "আপলোড চলছে…"
              : isPending
              ? "জমা হচ্ছে…"
              : "রিপোর্ট জমা দিন"}
          </button>
        </div>

      </div>
    </>
  );
}

// ─── Strip display-only fields before sending to server ───────────────────────

function toMeta(f: UploadedFile): FileMetadata {
  return {
    key:                   f.key,
    fileIV:                f.fileIV,
    fileTag:               f.fileTag,
    encryptedOriginalName: f.encryptedOriginalName,
    nameIV:                f.nameIV,
    nameTag:               f.nameTag,
    mimeType:              f.mimeType,
    fileSize:              f.fileSize,
  };
}
