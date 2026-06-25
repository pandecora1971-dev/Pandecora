"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { SignupStep1, SignupProfession } from "@/lib/validators";

interface SignupContextValue {
  step1: SignupStep1 | null;
  setStep1: (data: SignupStep1) => void;
  professionData: SignupProfession | null;
  setProfessionData: (data: SignupProfession) => void;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [step1, setStep1] = useState<SignupStep1 | null>(null);
  const [professionData, setProfessionData] = useState<SignupProfession | null>(null);
  return (
    <SignupContext.Provider value={{ step1, setStep1, professionData, setProfessionData }}>
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup(): SignupContextValue {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup must be used within a SignupProvider");
  return ctx;
}
