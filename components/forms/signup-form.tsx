"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, validatePasswordStrength } from "@/lib/auth-client";
import { signUpStep1Schema } from "@/lib/validators";

// Step 1 of the signup flow — personal info + credentials.
// Persists data to sessionStorage so step 2 can complete the combined submission.

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pwErrors, setPwErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { errors } = validatePasswordStrength(e.target.value);
    setPwErrors(errors);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: `${formData.get("firstName") as string} ${formData.get("lastName") as string}`.trim(),
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      teacherOrStudent: formData.get("teacherOrStudent") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const parsed = signUpStep1Schema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setFieldErrors(errs);
      setLoading(false);
      return;
    }

    // Persist step 1 data for the combined API call in step 2
    sessionStorage.setItem("signup_step1", JSON.stringify(parsed.data));

    router.push("/signup/location");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {(["firstName", "lastName"] as const).map((field) => (
          <div key={field} className="space-y-2">
            <label htmlFor={field} className="text-sm font-medium">
              {field === "firstName" ? "First name" : "Last name"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              id={field}
              name={field}
              type="text"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>
      {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone <span className="text-destructive">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+880…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          I am a <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-4">
          {(["TEACHER", "STUDENT"] as const).map((val) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="teacherOrStudent" value={val} required />
              <span className="text-sm capitalize">{val.toLowerCase()}</span>
            </label>
          ))}
        </div>
        {fieldErrors.teacherOrStudent && (
          <p className="text-xs text-destructive">{fieldErrors.teacherOrStudent}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password <span className="text-destructive">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          onChange={handlePasswordChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {pwErrors.length > 0 && (
          <ul className="space-y-0.5">
            {pwErrors.map((e) => (
              <li key={e} className="text-xs text-destructive">
                {e}
              </li>
            ))}
          </ul>
        )}
        {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password <span className="text-destructive">*</span>
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Continue →"}
      </button>
    </form>
  );
}
