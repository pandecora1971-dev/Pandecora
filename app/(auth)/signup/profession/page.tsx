"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useSignup } from "../_context";

// ─── Profession config ─────────────────────────────────────────────────────────

const ENGINEERING_DISCIPLINES = [
  { val: "সিভিল প্রকৌশল",        en: "Civil Engineering" },
  { val: "তড়িৎ প্রকৌশল",        en: "Electrical Engineering" },
  { val: "যন্ত্র প্রকৌশল",       en: "Mechanical Engineering" },
  { val: "কম্পিউটার প্রকৌশল",    en: "Computer Engineering" },
  { val: "রাসায়নিক প্রকৌশল",    en: "Chemical Engineering" },
  { val: "স্থাপত্য প্রকৌশল",     en: "Architectural Engineering" },
  { val: "অন্যান্য প্রকৌশল শাখা", en: "Other Discipline" },
];

const LAW_AREAS = [
  { val: "ফৌজদারি আইন",    en: "Criminal Law" },
  { val: "দেওয়ানি আইন",    en: "Civil Law" },
  { val: "পারিবারিক আইন",  en: "Family Law" },
  { val: "কর্পোরেট আইন",   en: "Corporate Law" },
  { val: "ভূমি আইন",       en: "Land Law" },
  { val: "অন্যান্য শাখা",  en: "Other" },
];

const AGRI_TYPES = [
  { val: "ফসল চাষ",   en: "Crop Farming" },
  { val: "পশুপালন",   en: "Livestock" },
  { val: "মৎস্য চাষ", en: "Fishery" },
  { val: "মিশ্র কৃষি", en: "Mixed Farming" },
  { val: "অন্যান্য",  en: "Other" },
];

// ─── Label helpers ─────────────────────────────────────────────────────────────

const PROFESSION_LABELS: Record<string, { bn: string; en: string }> = {
  DOCTOR:        { bn: "ডাক্তার",    en: "Doctor" },
  ENGINEER:      { bn: "প্রকৌশলী",   en: "Engineer" },
  LAWYER:        { bn: "আইনজীবী",    en: "Lawyer" },
  JOURNALIST:    { bn: "সাংবাদিক",   en: "Journalist" },
  AGRICULTURIST: { bn: "কৃষিবিদ",    en: "Agriculturist" },
  OTHERS:        { bn: "অন্যান্য",   en: "Others" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProfessionPage() {
  const router = useRouter();
  const { step1, setProfessionData } = useSignup();

  if (!step1) {
    if (typeof window !== "undefined") router.replace("/signup");
    return null;
  }

  const profession = step1.teacherOrStudent;
  const label = PROFESSION_LABELS[profession] ?? { bn: "পেশাদার", en: "Professional" };

  return <ProfessionForm profession={profession} label={label} />;
}

function ProfessionForm({
  profession,
  label,
}: {
  profession: string;
  label: { bn: string; en: string };
}) {
  const router = useRouter();
  const { setProfessionData } = useSignup();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discipline, setDiscipline] = useState("");
  const [lawArea, setLawArea] = useState("");
  const [agriType, setAgriType] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newErrors: Record<string, string> = {};

    const licenseNumber    = (fd.get("licenseNumber")    as string ?? "").trim();
    const organizationName = (fd.get("organizationName") as string ?? "").trim();
    const specializationRaw = (fd.get("specialization")  as string ?? "").trim();

    // Build specialization from select or free text depending on profession
    let specialization = specializationRaw;
    if (profession === "ENGINEER" && !discipline) {
      newErrors.discipline = "প্রকৌশল শাখা নির্বাচন করুন";
    } else if (profession === "ENGINEER") {
      specialization = discipline;
    }
    if (profession === "LAWYER" && !lawArea) {
      newErrors.lawArea = "আইনের শাখা নির্বাচন করুন";
    } else if (profession === "LAWYER") {
      specialization = lawArea;
    }
    if (profession === "AGRICULTURIST" && !agriType) {
      newErrors.agriType = "কৃষির ধরন নির্বাচন করুন";
    } else if (profession === "AGRICULTURIST") {
      specialization = agriType;
    }

    // Required fields per profession
    if (profession === "DOCTOR") {
      if (!licenseNumber)    newErrors.licenseNumber    = "বিএমডিসি নিবন্ধন নম্বর দিন";
      if (!organizationName) newErrors.organizationName = "হাসপাতাল বা ক্লিনিকের নাম দিন";
      if (!specialization)   newErrors.specialization   = "বিশেষজ্ঞতা উল্লেখ করুন";
    }
    if (profession === "ENGINEER") {
      if (!organizationName) newErrors.organizationName = "প্রতিষ্ঠান বা কোম্পানির নাম দিন";
    }
    if (profession === "LAWYER") {
      if (!licenseNumber)    newErrors.licenseNumber    = "বার কাউন্সিল নিবন্ধন নম্বর দিন";
      if (!organizationName) newErrors.organizationName = "চেম্বার বা আদালতের নাম দিন";
    }
    if (profession === "JOURNALIST") {
      if (!organizationName) newErrors.organizationName = "গণমাধ্যম প্রতিষ্ঠানের নাম দিন";
    }
    if (profession === "OTHERS") {
      if (!specialization)   newErrors.specialization   = "পেশার বিবরণ দিন";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProfessionData({
      licenseNumber:    licenseNumber    || undefined,
      organizationName: organizationName || undefined,
      specialization:   specialization   || undefined,
    });
    router.push("/signup/location");
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between bg-[#25282b] px-12 py-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
            <Shield size={17} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Pandecora</span>
        </Link>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">ধাপ ২ — পেশাদার তথ্য</p>
          <h2 className="mt-4 text-5xl font-black uppercase leading-[1.05] tracking-tight text-white">
            {label.bn}<br />হিসেবে<br />নিবন্ধন।
          </h2>
          <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-white/55">
            আপনার পেশাদার তথ্য সুরক্ষিতভাবে সংরক্ষণ করা হবে এবং
            শুধুমাত্র অনুমোদিত কর্মীরা দেখতে পাবেন।
          </p>

          <div className="mt-10 space-y-3">
            {[
              { bn: "ব্যক্তিগত তথ্য ও পরিচয়", en: "Personal info & credentials", done: true,   active: false },
              { bn: "পেশাদার তথ্য",             en: "Professional details",        done: false,  active: true },
              { bn: "অবস্থান ও প্রতিষ্ঠান",    en: "Location & institution",      done: false,  active: false },
            ].map(({ bn, en, done, active }, i) => (
              <div key={en}>
                {i > 0 && <div className="ml-3.5 h-5 w-px bg-white/20 mb-3" />}
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? "bg-[#e60000] text-white" : done ? "bg-green-600 text-white" : "bg-white/15 text-white/40"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-white" : done ? "text-white/70" : "text-white/40"}`}>{bn}</p>
                    <p className={`text-xs ${active || done ? "text-white/40" : "text-white/25"}`}>{en}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Pandecora</p>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-14 overflow-y-auto">

        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
              <Shield size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#25282b]">Pandecora</span>
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#e60000]">ধাপ ২ — পেশাদার তথ্য</p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-[#25282b]">
              {label.bn} তথ্য
            </h1>
            <p className="text-xs text-[#7e7e7e] mt-0.5">{label.en} details</p>
            <p className="mt-2 text-sm text-[#7e7e7e]">আপনার পেশাদার তথ্য পূরণ করুন</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {Object.keys(errors).length > 0 && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#e60000]">
                নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন।
              </div>
            )}

            {/* ── DOCTOR ── */}
            {profession === "DOCTOR" && (
              <>
                <Field id="licenseNumber" label="বিএমডিসি নিবন্ধন নম্বর" labelEn="BMDC Registration No." error={errors.licenseNumber} required>
                  <input id="licenseNumber" name="licenseNumber" type="text" placeholder="যেমন: A-12345" className={inputCn(!!errors.licenseNumber)} />
                </Field>
                <Field id="organizationName" label="হাসপাতাল / ক্লিনিক" labelEn="Hospital / Clinic" error={errors.organizationName} required>
                  <input id="organizationName" name="organizationName" type="text" placeholder="হাসপাতাল বা ক্লিনিকের নাম" className={inputCn(!!errors.organizationName)} />
                </Field>
                <Field id="specialization" label="বিশেষজ্ঞতা" labelEn="Specialization" error={errors.specialization} required>
                  <input id="specialization" name="specialization" type="text" placeholder="যেমন: কার্ডিওলজি, গাইনোকোলজি" className={inputCn(!!errors.specialization)} />
                </Field>
              </>
            )}

            {/* ── ENGINEER ── */}
            {profession === "ENGINEER" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[#25282b]">
                    প্রকৌশল শাখা <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(Engineering Discipline)</span>
                    <span className="text-[#e60000]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ENGINEERING_DISCIPLINES.map(({ val, en }) => (
                      <label key={val} className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 text-sm transition-colors ${discipline === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 text-[#25282b] hover:bg-gray-50"}`}>
                        <input type="radio" name="discipline" value={val} checked={discipline === val} onChange={() => { setDiscipline(val); setErrors((p) => { const n = {...p}; delete n.discipline; return n; }); }} className="sr-only" />
                        <span className="font-semibold text-xs">{val}</span>
                        <span className="text-[10px] opacity-60">{en}</span>
                      </label>
                    ))}
                  </div>
                  {errors.discipline && <p role="alert" className="text-xs text-[#e60000]">{errors.discipline}</p>}
                </div>
                <Field id="organizationName" label="প্রতিষ্ঠান / কোম্পানি" labelEn="Company / Organization" error={errors.organizationName} required>
                  <input id="organizationName" name="organizationName" type="text" placeholder="প্রতিষ্ঠান বা কোম্পানির নাম" className={inputCn(!!errors.organizationName)} />
                </Field>
                <Field id="licenseNumber" label="আইইবি সদস্যপদ নম্বর" labelEn="IEB Membership No. (optional)" error={errors.licenseNumber}>
                  <input id="licenseNumber" name="licenseNumber" type="text" placeholder="ঐচ্ছিক" className={inputCn(!!errors.licenseNumber)} />
                </Field>
              </>
            )}

            {/* ── LAWYER ── */}
            {profession === "LAWYER" && (
              <>
                <Field id="licenseNumber" label="বার কাউন্সিল নিবন্ধন নম্বর" labelEn="Bar Council Enrollment No." error={errors.licenseNumber} required>
                  <input id="licenseNumber" name="licenseNumber" type="text" placeholder="যেমন: BD/1234/2020" className={inputCn(!!errors.licenseNumber)} />
                </Field>
                <Field id="organizationName" label="চেম্বার / আদালত" labelEn="Chamber / Court" error={errors.organizationName} required>
                  <input id="organizationName" name="organizationName" type="text" placeholder="চেম্বার বা আদালতের নাম" className={inputCn(!!errors.organizationName)} />
                </Field>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[#25282b]">
                    আইনের শাখা <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(Area of Practice)</span>
                    <span className="text-[#e60000]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {LAW_AREAS.map(({ val, en }) => (
                      <label key={val} className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 text-sm transition-colors ${lawArea === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 text-[#25282b] hover:bg-gray-50"}`}>
                        <input type="radio" name="lawArea" value={val} checked={lawArea === val} onChange={() => { setLawArea(val); setErrors((p) => { const n = {...p}; delete n.lawArea; return n; }); }} className="sr-only" />
                        <span className="font-semibold text-xs">{val}</span>
                        <span className="text-[10px] opacity-60">{en}</span>
                      </label>
                    ))}
                  </div>
                  {errors.lawArea && <p role="alert" className="text-xs text-[#e60000]">{errors.lawArea}</p>}
                </div>
              </>
            )}

            {/* ── JOURNALIST ── */}
            {profession === "JOURNALIST" && (
              <>
                <Field id="organizationName" label="গণমাধ্যম প্রতিষ্ঠান" labelEn="Media Organization" error={errors.organizationName} required>
                  <input id="organizationName" name="organizationName" type="text" placeholder="পত্রিকা, টেলিভিশন বা অনলাইন পোর্টালের নাম" className={inputCn(!!errors.organizationName)} />
                </Field>
                <Field id="specialization" label="বিট / কভারেজ এলাকা" labelEn="Beat / Coverage Area (optional)" error={errors.specialization}>
                  <input id="specialization" name="specialization" type="text" placeholder="যেমন: রাজনীতি, অপরাধ, প্রযুক্তি" className={inputCn(!!errors.specialization)} />
                </Field>
                <Field id="licenseNumber" label="প্রেস কার্ড নম্বর" labelEn="Press Card No. (optional)" error={errors.licenseNumber}>
                  <input id="licenseNumber" name="licenseNumber" type="text" placeholder="ঐচ্ছিক" className={inputCn(!!errors.licenseNumber)} />
                </Field>
              </>
            )}

            {/* ── AGRICULTURIST ── */}
            {profession === "AGRICULTURIST" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[#25282b]">
                    কৃষির ধরন <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(Agriculture Type)</span>
                    <span className="text-[#e60000]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AGRI_TYPES.map(({ val, en }) => (
                      <label key={val} className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 text-sm transition-colors ${agriType === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 text-[#25282b] hover:bg-gray-50"}`}>
                        <input type="radio" name="agriType" value={val} checked={agriType === val} onChange={() => { setAgriType(val); setErrors((p) => { const n = {...p}; delete n.agriType; return n; }); }} className="sr-only" />
                        <span className="font-semibold text-xs">{val}</span>
                        <span className="text-[10px] opacity-60">{en}</span>
                      </label>
                    ))}
                  </div>
                  {errors.agriType && <p role="alert" className="text-xs text-[#e60000]">{errors.agriType}</p>}
                </div>
                <Field id="organizationName" label="কৃষি প্রতিষ্ঠান / সমবায়" labelEn="Organization / Cooperative (optional)" error={errors.organizationName}>
                  <input id="organizationName" name="organizationName" type="text" placeholder="ঐচ্ছিক" className={inputCn(!!errors.organizationName)} />
                </Field>
                <Field id="specialization" label="প্রধান ফসল / পণ্য" labelEn="Main Crops / Products (optional)" error={errors.specialization}>
                  <input id="specialization" name="specialization" type="text" placeholder="যেমন: ধান, সবজি, মাছ" className={inputCn(!!errors.specialization)} />
                </Field>
              </>
            )}

            {/* ── OTHERS ── */}
            {profession === "OTHERS" && (
              <>
                <Field id="specialization" label="পেশার বিবরণ" labelEn="Profession Description" error={errors.specialization} required>
                  <input id="specialization" name="specialization" type="text" placeholder="আপনার পেশা সংক্ষেপে বর্ণনা করুন" className={inputCn(!!errors.specialization)} />
                </Field>
                <Field id="organizationName" label="প্রতিষ্ঠান" labelEn="Organization (optional)" error={errors.organizationName}>
                  <input id="organizationName" name="organizationName" type="text" placeholder="ঐচ্ছিক" className={inputCn(!!errors.organizationName)} />
                </Field>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-[#25282b] transition-colors hover:bg-gray-50"
              >
                <ArrowLeft size={15} />
                পূর্ববর্তী
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-[#e60000] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000]"
              >
                পরবর্তী →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function inputCn(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-gray-50 px-4 py-3 text-sm text-[#25282b]",
    "placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2",
    hasError ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15" : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15",
  ].join(" ");
}

function Field({ id, label, labelEn, error, required, children }: {
  id: string; label: string; labelEn?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-[#25282b]">
        {label}
        {labelEn && <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">({labelEn})</span>}
        {required && <span className="ml-0.5 text-[#e60000]">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-[#e60000]">{error}</p>}
    </div>
  );
}
