import { z } from "zod";

// ─── Bangladesh geography ──────────────────────────────────────────────────────

export const BANGLADESH_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

type Division = (typeof BANGLADESH_DIVISIONS)[number];

export const DISTRICTS_BY_DIVISION: Record<Division, readonly string[]> = {
  Dhaka: [
    "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj",
    "Madaripur", "Manikganj", "Munshiganj", "Narayanganj",
    "Narsingdi", "Rajbari", "Shariatpur", "Tangail",
  ],
  Chattogram: [
    "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Comilla",
    "Cox's Bazar", "Feni", "Khagrachari", "Lakshmipur", "Noakhali", "Rangamati",
  ],
  Rajshahi: [
    "Bogura", "Chapainawabganj", "Joypurhat", "Naogaon",
    "Natore", "Pabna", "Rajshahi", "Sirajganj",
  ],
  Khulna: [
    "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna",
    "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira",
  ],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: [
    "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat",
    "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

// ─── Security base ─────────────────────────────────────────────────────────────
//
// _secureChecks: rejection guards only (no transform). Used for password fields
// so that the raw bytes sent to argon2 exactly match on signup AND login.
//
// _secure: same guards + strip < > + trim. Used for all other text fields.

const _secureChecks = z
  .string()
  .refine((s) => !s.includes("\0"), "Contains invalid characters")
  .refine((s) => !/<script[\s\S]*?>/i.test(s), "Contains disallowed content")
  .refine(
    (s) => !/\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC)\b/i.test(s),
    "Contains disallowed content"
  )
  .refine((s) => !s.includes("../"), "Contains disallowed characters");

const _secure = _secureChecks.transform((s) => s.replace(/[<>]/g, "").trim());

/** Required string: security checks + length bounds on the cleaned value. */
function ss(min: number, max: number) {
  return _secure.pipe(
    z
      .string()
      .min(min, `Must be at least ${min} characters`)
      .max(max, `Must be ${max} characters or fewer`)
  );
}

/**
 * Optional string: security checks + max-length on the cleaned value.
 * Empty strings are coerced to undefined so Prisma nullable columns stay null.
 */
function sso(max: number) {
  return _secure
    .pipe(z.string().max(max, `Must be ${max} characters or fewer`))
    .optional()
    .transform((v): string | undefined => (v === "" ? undefined : v));
}

// ─── Specialised field schemas ─────────────────────────────────────────────────

/** Email: security checks → trim → lowercase → RFC-5321 format check. */
const emailField = z
  .string()
  .refine((s) => !s.includes("\0"), "Contains invalid characters")
  .refine((s) => !/<script[\s\S]*?>/i.test(s), "Contains disallowed content")
  .refine(
    (s) => !/\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC)\b/i.test(s),
    "Contains disallowed content"
  )
  .refine((s) => !s.includes("../"), "Contains disallowed characters")
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().email("Invalid email address"));

/**
 * Bangladesh mobile number.
 * Strips all non-digit characters first (e.g. spaces, dashes), then validates
 * the canonical 01[3-9]XXXXXXXX format (11 digits).
 */
const bangladeshPhone = z
  .string()
  .refine((s) => !s.includes("\0"), "Contains invalid characters")
  .transform((s) => s.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .length(11, "Phone number must be 11 digits")
      .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladesh phone number (e.g. 01712345678)")
  );

/** A single http(s) URL, max 2000 chars. Auto-prepends https:// if no protocol given. */
const safeUrl = z
  .string()
  .max(2000, "URL must be 2000 characters or fewer")
  .refine((s) => !s.includes("\0"), "Invalid URL")
  .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
  .pipe(
    z.string().refine((s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    }, "Invalid URL format")
  );

/** Array of safe URLs, max 10 items. */
const urlList = z.array(safeUrl).max(10, "Maximum 10 URLs allowed");

// ─── Password ──────────────────────────────────────────────────────────────────

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[^A-Za-z0-9]/,
} as const;

export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/** Pure function — safe to call on both client and server. */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  if (password.length < PASSWORD_RULES.minLength)
    errors.push(`At least ${PASSWORD_RULES.minLength} characters`);
  if (password.length > PASSWORD_RULES.maxLength)
    errors.push(`No more than ${PASSWORD_RULES.maxLength} characters`);
  if (!PASSWORD_RULES.uppercase.test(password))
    errors.push("At least one uppercase letter (A–Z)");
  if (!PASSWORD_RULES.lowercase.test(password))
    errors.push("At least one lowercase letter (a–z)");
  if (!PASSWORD_RULES.digit.test(password))
    errors.push("At least one digit (0–9)");
  if (!PASSWORD_RULES.special.test(password))
    errors.push("At least one special character (!@#$…)");
  return { valid: errors.length === 0, errors };
}

const passwordField = _secureChecks.pipe(
  z
    .string()
    .min(PASSWORD_RULES.minLength, `At least ${PASSWORD_RULES.minLength} characters`)
    .max(PASSWORD_RULES.maxLength)
    .regex(PASSWORD_RULES.uppercase, "At least one uppercase letter (A–Z)")
    .regex(PASSWORD_RULES.lowercase, "At least one lowercase letter (a–z)")
    .regex(PASSWORD_RULES.digit, "At least one digit (0–9)")
    .regex(PASSWORD_RULES.special, "At least one special character (!@#$…)")
);

// ─── 1. signupStep1Schema ──────────────────────────────────────────────────────

export const PROFESSION_VALUES = [
  "TEACHER", "STUDENT",
  "DOCTOR", "ENGINEER", "LAWYER", "JOURNALIST", "AGRICULTURIST", "OTHERS",
] as const;

export type ProfessionValue = (typeof PROFESSION_VALUES)[number];

export const ACADEMIC_PROFESSIONS: ProfessionValue[] = ["TEACHER", "STUDENT"];

export function isAcademic(p: ProfessionValue) {
  return ACADEMIC_PROFESSIONS.includes(p);
}

export const signupStep1Schema = z
  .object({
    name: ss(2, 100),
    email: emailField,
    phone: bangladeshPhone,
    password: passwordField,
    confirmPassword: z.string(),
    teacherOrStudent: z.enum(PROFESSION_VALUES, {
      required_error: "আপনার পেশা নির্বাচন করুন",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "পাসওয়ার্ড মিলছে না",
    path: ["confirmPassword"],
  });

export const signupProfessionSchema = z.object({
  licenseNumber:    sso(100),
  organizationName: sso(200),
  specialization:   sso(200),
});

export type SignupProfession = z.infer<typeof signupProfessionSchema>;

/** @deprecated Use signupStep1Schema */
export const signUpStep1Schema = signupStep1Schema;

// ─── 2. signupStep2Schema ──────────────────────────────────────────────────────

export const signupStep2Schema = z
  .object({
    division: z.enum(BANGLADESH_DIVISIONS, {
      errorMap: () => ({ message: "Select a valid division" }),
    }),
    district: ss(2, 100),
    upazila: ss(2, 100),
    specificAddress: sso(500),
    institutionType: z.enum(
      ["UNIVERSITY", "SCHOOL", "COLLEGE", "MADRASA", "OTHERS"] as const,
      { required_error: "Select an institution type" }
    ),
    universityType: z.enum(["PUBLIC", "PRIVATE", "OTHERS"] as const).optional(),
    institutionName: ss(2, 200),
    department: sso(200),
  })
  .refine(
    (d) => DISTRICTS_BY_DIVISION[d.division].includes(d.district),
    { message: "District does not belong to the selected division", path: ["district"] }
  )
  .refine(
    (d) => d.institutionType !== "UNIVERSITY" || d.universityType !== undefined,
    { message: "Select a university type", path: ["universityType"] }
  );

/** @deprecated Use signupStep2Schema */
export const signUpStep2Schema = signupStep2Schema;

// ─── Combined signup schema (used by the API route) ───────────────────────────

export const signUpSchema = z
  .object({
    name: ss(2, 100),
    email: emailField,
    phone: bangladeshPhone,
    password: passwordField,
    confirmPassword: z.string(),
    teacherOrStudent: z.enum(PROFESSION_VALUES, {
      required_error: "আপনার পেশা নির্বাচন করুন",
    }),
    division: z.enum(BANGLADESH_DIVISIONS, {
      errorMap: () => ({ message: "সঠিক বিভাগ নির্বাচন করুন" }),
    }),
    district: ss(2, 100),
    upazila: ss(2, 100),
    specificAddress: sso(500),
    // Academic-only fields — validated conditionally below
    institutionType: z.enum(
      ["UNIVERSITY", "SCHOOL", "COLLEGE", "MADRASA", "OTHERS"] as const
    ).optional(),
    universityType: z.enum(["PUBLIC", "PRIVATE", "OTHERS"] as const).optional(),
    institutionName: _secure.pipe(z.string().max(200)).optional(),
    department: sso(200),
    // Professional-only fields
    licenseNumber:    sso(100),
    organizationName: sso(200),
    specialization:   sso(200),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "পাসওয়ার্ড মিলছে না",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => DISTRICTS_BY_DIVISION[d.division].includes(d.district),
    { message: "নির্বাচিত বিভাগে এই জেলা নেই", path: ["district"] }
  )
  .superRefine((d, ctx) => {
    if (isAcademic(d.teacherOrStudent)) {
      if (!d.institutionType)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "প্রতিষ্ঠানের ধরন নির্বাচন করুন", path: ["institutionType"] });
      if (!d.institutionName || d.institutionName.trim().length < 2)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "প্রতিষ্ঠানের নাম লিখুন", path: ["institutionName"] });
      if (d.institutionType === "UNIVERSITY" && !d.universityType)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "বিশ্ববিদ্যালয়ের ধরন নির্বাচন করুন", path: ["universityType"] });
    }
  });

// ─── 3. incidentReportSchema ───────────────────────────────────────────────────

export const incidentReportSchema = z.object({
  category: z.enum(
    [
      "HARASSMENT_BULLYING",
      "BLACKMAIL_THREATS",
      "CORRUPTION_BRIBERY_EXTORTION",
      "DISCRIMINATION_BIAS",
      "ACADEMIC_MALPRACTICE",
      "THEFT_PROPERTY_DAMAGE",
      "OTHER_CRIME_POLICY_VIOLATION",
    ] as const,
    { required_error: "Select a category" }
  ),
  urgencyLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const, {
    required_error: "Select an urgency level",
  }),
  description: ss(10, 10000),
  links: urlList.default([]),
  accusedName: sso(200),
  accusedDetails: sso(5000),
  accusedLinks: urlList.default([]),
  additionalName: sso(200),
  additionalDetails: sso(5000),
  additionalLinks: urlList.default([]),
});

// ─── 4. loginSchema ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
});

// ─── 5. contactSchema ─────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: ss(2, 100),
  email: emailField,
  message: ss(10, 5000),
});

// ─── Admin login schema (internal) ────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
  totpCode: z
    .string()
    .length(6, "Must be exactly 6 digits")
    .regex(/^\d{6}$/, "Must be 6 digits")
    .optional(),
});

// ─── Exported types ────────────────────────────────────────────────────────────

export type SignupStep1 = z.infer<typeof signupStep1Schema>;
export type SignupStep2 = z.infer<typeof signupStep2Schema>;
export type SignUpStep1 = SignupStep1;
export type SignUpStep2 = SignupStep2;
export type SignUpData = z.infer<typeof signUpSchema>;
export type IncidentReportData = z.infer<typeof incidentReportSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
