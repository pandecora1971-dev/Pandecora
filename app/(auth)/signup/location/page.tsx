"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useSignup } from "../_context";
import { signupAction } from "../actions";
import { isAcademic } from "@/lib/validators";
import { BANGLADESH_LOCATIONS } from "@/lib/bangladesh-locations";

// ─── University lists ──────────────────────────────────────────────────────────

const PUBLIC_UNIVERSITIES = [
  "University of Dhaka", "University of Rajshahi", "University of Chittagong",
  "Jahangirnagar University", "Islamic University, Bangladesh",
  "Shahjalal University of Science and Technology", "Khulna University",
  "Comilla University", "Jatiya Kabi Kazi Nazrul Islam University",
  "Begum Rokeya University", "Noakhali Science and Technology University",
  "Mawlana Bhashani Science and Technology University",
  "Pabna University of Science and Technology", "Barisal University",
  "Bangabandhu Sheikh Mujibur Rahman Science and Technology University",
  "Rabindra University, Bangladesh", "Sheikh Hasina University",
  "Bangamata Sheikh Fojilatunnesa Mujib Science and Technology University",
  "Bangladesh University of Engineering and Technology (BUET)",
  "Rajshahi University of Engineering and Technology (RUET)",
  "Khulna University of Engineering and Technology (KUET)",
  "Chittagong University of Engineering and Technology (CUET)",
  "Dhaka University of Engineering and Technology (DUET)",
  "Jashore University of Science and Technology",
  "Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh",
  "Bangladesh Agricultural University", "Sher-e-Bangla Agricultural University",
  "Sylhet Agricultural University", "Patuakhali Science and Technology University",
  "Bangabandhu Sheikh Mujibur Rahman Agricultural University",
  "Chittagong Veterinary and Animal Sciences University",
  "Bangladesh University of Textiles (BUTEX)",
  "Bangladesh University of Professionals (BUP)",
  "Bangabandhu Sheikh Mujibur Rahman Maritime University",
  "National University", "Bangladesh Open University",
].sort();

const PRIVATE_UNIVERSITIES = [
  "North South University", "BRAC University",
  "Independent University, Bangladesh (IUB)",
  "American International University Bangladesh (AIUB)", "East West University",
  "Ahsanullah University of Science and Technology",
  "Daffodil International University", "United International University",
  "Southeast University", "Stamford University Bangladesh",
  "Bangladesh University of Business and Technology (BUBT)",
  "Manarat International University", "Green University of Bangladesh",
  "University of Asia Pacific", "Metropolitan University", "Leading University",
  "East Delta University", "Port City International University",
  "Premier University, Chittagong",
  "University of Science and Technology Chittagong (USTC)",
  "International Islamic University Chittagong (IIUC)",
  "BGC Trust University Bangladesh", "Southern University Bangladesh",
  "Asian University of Bangladesh",
  "BGMEA University of Fashion and Technology",
  "Dhaka International University", "Primeasia University",
  "Central Women's University",
  "Shanto-Mariam University of Creative Technology",
  "State University of Bangladesh", "City University",
  "International University of Business Agriculture and Technology (IUBAT)",
  "Canadian University of Bangladesh", "Uttara University",
  "Fareast International University", "Notre Dame University Bangladesh",
  "Varendra University", "Pundra University of Science and Technology",
  "University of Development Alternative (UODA)",
  "Atish Dipankar University of Science and Technology",
  "World University of Bangladesh",
  "Bangladesh Army University of Engineering and Technology",
  "Bangladesh Army International University of Science and Technology",
  "Bangladesh Navy University", "Chittagong Independent University",
].sort();

const OTHER_UNI = "__other__";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SignupLocationPage() {
  const router = useRouter();
  const { step1 } = useSignup();

  if (!step1) {
    if (typeof window !== "undefined") router.replace("/signup");
    return null;
  }

  return <LocationForm />;
}

function LocationForm() {
  const { step1, professionData } = useSignup();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const academic = step1 ? isAcademic(step1.teacherOrStudent) : true;

  const [division,        setDivision]        = useState("");
  const [district,        setDistrict]        = useState("");
  const [upazila,         setUpazila]         = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [universityType,  setUniversityType]  = useState("");
  const [uniChoice,       setUniChoice]       = useState("");
  const [customName,      setCustomName]      = useState("");

  const [error,       setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const districtOptions = division ? Object.keys(BANGLADESH_LOCATIONS[division] ?? {}).sort() : [];
  const upazilaOptions  = division && district ? (BANGLADESH_LOCATIONS[division]?.[district] ?? []).slice().sort() : [];

  const isUniDropdown = institutionType === "UNIVERSITY" && (universityType === "PUBLIC" || universityType === "PRIVATE");
  const institutionName = isUniDropdown
    ? (uniChoice === OTHER_UNI ? customName : uniChoice)
    : customName;

  function clearFieldError(key: string) {
    setFieldErrors((prev) => { if (!prev[key]) return prev; const next = { ...prev }; delete next[key]; return next; });
  }

  function handleInstitutionTypeChange(val: string) {
    setInstitutionType(val); setUniversityType(""); setUniChoice(""); setCustomName("");
    clearFieldError("institutionType"); clearFieldError("universityType"); clearFieldError("institutionName");
  }
  function handleUniversityTypeChange(val: string) {
    setUniversityType(val); setUniChoice(""); setCustomName("");
    clearFieldError("universityType"); clearFieldError("institutionName");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    if (academic) fd.set("institutionName", institutionName);
    // Pass profession data for professional users
    if (!academic && professionData) {
      fd.set("licenseNumber",    professionData.licenseNumber    ?? "");
      fd.set("organizationName", professionData.organizationName ?? "");
      fd.set("specialization",   professionData.specialization   ?? "");
    }
    startTransition(async () => {
      const result = await signupAction(step1, fd);
      if (result?.error)       setError(result.error);
      if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  }

  const uniList = universityType === "PUBLIC" ? PUBLIC_UNIVERSITIES : PRIVATE_UNIVERSITIES;

  const stepLabel = academic ? "ধাপ ২ — অবস্থান ও প্রতিষ্ঠান" : "ধাপ ৩ — অবস্থান";
  const backPath  = academic ? "/signup" : "/signup/profession";

  return (
    <div className="flex min-h-screen">

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[35%] flex-col justify-between bg-[#25282b] px-12 py-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
            <Shield size={17} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Pandecora</span>
        </Link>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">{stepLabel}</p>
          <h2 className="mt-4 text-5xl font-black uppercase leading-[1.05] tracking-tight text-white">
            প্রায়<br />শেষ।
          </h2>
          <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-white/55">
            আপনার অবস্থান ও{academic ? " প্রতিষ্ঠানের" : ""} তথ্য দিন।
            এটি প্রতিবেদনকে সঠিক কর্তৃপক্ষের কাছে পাঠাতে সাহায্য করে।
          </p>

          <div className="mt-10 space-y-3">
            {(academic
              ? [
                  { bn: "ব্যক্তিগত তথ্য ও পরিচয়", en: "Personal info",       done: true,  active: false },
                  { bn: "অবস্থান ও প্রতিষ্ঠান",    en: "Location & institution", done: false, active: true  },
                ]
              : [
                  { bn: "ব্যক্তিগত তথ্য ও পরিচয়", en: "Personal info",        done: true,  active: false },
                  { bn: "পেশাদার তথ্য",             en: "Professional details", done: true,  active: false },
                  { bn: "অবস্থান",                  en: "Location",             done: false, active: true  },
                ]
            ).map(({ bn, en, done, active }, i) => (
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
      <div className="flex flex-1 flex-col bg-white px-6 py-12 sm:px-12 lg:px-14 overflow-y-auto">

        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
              <Shield size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#25282b]">Pandecora</span>
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#e60000]">{stepLabel}</p>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-[#25282b]">
              {academic ? "অবস্থান ও প্রতিষ্ঠান" : "অবস্থান"}
            </h1>
            <p className="text-xs text-[#7e7e7e] mt-0.5">{academic ? "Location & institution" : "Location"}</p>
            <p className="mt-2 text-sm text-[#7e7e7e]">আপনার প্রেক্ষাপট সম্পর্কে জানান</p>
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-lg border border-[#e60000]/20 bg-[#e60000]/5 px-4 py-3 text-sm text-[#e60000]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* ── Location section ── */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">অবস্থান — Location</p>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4">

                <Field id="division" label="বিভাগ" labelEn="Division" error={fieldErrors.division} required>
                  <select id="division" name="division" value={division} onChange={(e) => { setDivision(e.target.value); setDistrict(""); setUpazila(""); clearFieldError("division"); }} className={selectCn(!!fieldErrors.division)}>
                    <option value="">বিভাগ নির্বাচন করুন</option>
                    {Object.keys(BANGLADESH_LOCATIONS).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field id="district" label="জেলা" labelEn="District" error={fieldErrors.district} required>
                  <select id="district" name="district" value={district} onChange={(e) => { setDistrict(e.target.value); setUpazila(""); clearFieldError("district"); }} disabled={!division} className={selectCn(!!fieldErrors.district)}>
                    <option value="">{division ? "জেলা নির্বাচন করুন" : "আগে বিভাগ নির্বাচন করুন"}</option>
                    {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field id="upazila" label="উপজেলা" labelEn="Upazila" error={fieldErrors.upazila} required>
                  <select id="upazila" name="upazila" value={upazila} onChange={(e) => { setUpazila(e.target.value); clearFieldError("upazila"); }} disabled={!district} className={selectCn(!!fieldErrors.upazila)}>
                    <option value="">{district ? "উপজেলা নির্বাচন করুন" : "আগে জেলা নির্বাচন করুন"}</option>
                    {upazilaOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>

                <Field id="specificAddress" label="নির্দিষ্ট ঠিকানা" labelEn="Specific Address (optional)" error={fieldErrors.specificAddress}>
                  <textarea
                    id="specificAddress" name="specificAddress" rows={2}
                    placeholder="বাড়ি / রাস্তা / এলাকার বিবরণ (ঐচ্ছিক)" maxLength={500}
                    className={["w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-[#25282b]", "placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2", fieldErrors.specificAddress ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15" : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15"].join(" ")}
                  />
                </Field>
              </div>
            </div>

            {/* ── Institution section (academic only) ── */}
            {academic && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">প্রতিষ্ঠান — Institution</p>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4">

                  <fieldset>
                    <legend className="text-sm font-semibold text-[#25282b]">
                      প্রতিষ্ঠানের ধরন <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(Institution type)</span>
                      <span className="text-[#e60000]">*</span>
                    </legend>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {([
                        { val: "UNIVERSITY", bn: "বিশ্ববিদ্যালয়" },
                        { val: "SCHOOL",     bn: "স্কুল" },
                        { val: "COLLEGE",    bn: "কলেজ" },
                        { val: "MADRASA",    bn: "মাদ্রাসা" },
                        { val: "OTHERS",     bn: "অন্যান্য" },
                      ] as const).map(({ val, bn }) => (
                        <label key={val} className={["flex cursor-pointer flex-col items-center justify-center rounded-lg border px-3 py-2.5 text-center transition-colors", institutionType === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 bg-white text-[#25282b] hover:bg-gray-50"].join(" ")}>
                          <input type="radio" name="institutionType" value={val} checked={institutionType === val} onChange={() => handleInstitutionTypeChange(val)} className="sr-only" />
                          <span className="text-sm font-medium">{bn}</span>
                          <span className="text-[10px] opacity-60">{val.charAt(0) + val.slice(1).toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                    {fieldErrors.institutionType && <p role="alert" className="mt-1.5 text-xs text-[#e60000]">{fieldErrors.institutionType}</p>}
                  </fieldset>

                  {institutionType === "UNIVERSITY" && (
                    <fieldset>
                      <legend className="text-sm font-semibold text-[#25282b]">
                        বিশ্ববিদ্যালয়ের ধরন <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(University type)</span>
                        <span className="text-[#e60000]">*</span>
                      </legend>
                      <div className="mt-2.5 flex gap-3">
                        {([
                          { val: "PUBLIC",  bn: "সরকারি" },
                          { val: "PRIVATE", bn: "বেসরকারি" },
                          { val: "OTHERS",  bn: "অন্যান্য" },
                        ] as const).map(({ val, bn }) => (
                          <label key={val} className="flex cursor-pointer items-center gap-2 group">
                            <input type="radio" name="universityType" value={val} checked={universityType === val} onChange={() => handleUniversityTypeChange(val)} className="h-4 w-4 cursor-pointer accent-[#e60000]" />
                            <span className="text-sm text-[#25282b] group-hover:text-[#e60000]">
                              {bn} <span className="text-xs text-[#7e7e7e]">({val.charAt(0) + val.slice(1).toLowerCase()})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {fieldErrors.universityType && <p role="alert" className="mt-1.5 text-xs text-[#e60000]">{fieldErrors.universityType}</p>}
                    </fieldset>
                  )}

                  {isUniDropdown && (
                    <Field id="uniChoice" label={universityType === "PUBLIC" ? "সরকারি বিশ্ববিদ্যালয়" : "বেসরকারি বিশ্ববিদ্যালয়"} labelEn={universityType === "PUBLIC" ? "Public University" : "Private University"} error={fieldErrors.institutionName} required>
                      <>
                        <select id="uniChoice" value={uniChoice} onChange={(e) => { setUniChoice(e.target.value); clearFieldError("institutionName"); }} className={selectCn(!!fieldErrors.institutionName)}>
                          <option value="">বিশ্ববিদ্যালয় নির্বাচন করুন</option>
                          {uniList.map((u) => <option key={u} value={u}>{u}</option>)}
                          <option value={OTHER_UNI}>তালিকায় নেই (Other)</option>
                        </select>
                        {uniChoice === OTHER_UNI && (
                          <input type="text" value={customName} onChange={(e) => { setCustomName(e.target.value); clearFieldError("institutionName"); }} placeholder="বিশ্ববিদ্যালয়ের নাম লিখুন" className={`mt-2 ${inputCn(!!fieldErrors.institutionName)}`} />
                        )}
                      </>
                    </Field>
                  )}

                  {(institutionType !== "UNIVERSITY" || universityType === "OTHERS") && institutionType !== "" && (
                    <Field id="institutionNameInput" label="প্রতিষ্ঠানের নাম" labelEn="Institution Name" error={fieldErrors.institutionName} required>
                      <input
                        id="institutionNameInput" type="text" value={customName}
                        onChange={(e) => { setCustomName(e.target.value); clearFieldError("institutionName"); }}
                        placeholder={
                          institutionType === "SCHOOL"  ? "যেমন: ঢাকা রেসিডেন্সিয়াল মডেল কলেজ" :
                          institutionType === "COLLEGE" ? "যেমন: নটর ডেম কলেজ" :
                          institutionType === "MADRASA" ? "যেমন: দারুল উলুম মাদ্রাসা" :
                          "প্রতিষ্ঠানের নাম লিখুন"
                        }
                        className={inputCn(!!fieldErrors.institutionName)}
                      />
                    </Field>
                  )}

                  <input type="hidden" name="institutionName" value={institutionName} />

                  <Field id="department" label="বিভাগ / বিষয়" labelEn="Department / Subject (optional)" error={fieldErrors.department}>
                    <input id="department" name="department" type="text" placeholder="যেমন: কম্পিউটার সায়েন্স (ঐচ্ছিক)" className={inputCn(!!fieldErrors.department)} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Buttons ── */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push(backPath)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-[#25282b] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={15} />
                পূর্ববর্তী
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex-1 rounded-lg bg-[#e60000] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "অ্যাকাউন্ট তৈরি হচ্ছে…" : "নিবন্ধন সম্পন্ন করুন"}
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
  return ["w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#25282b]", "placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2", hasError ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15" : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15"].join(" ");
}

function selectCn(hasError: boolean): string {
  return ["w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#25282b]", "transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50", hasError ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15" : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15"].join(" ");
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
