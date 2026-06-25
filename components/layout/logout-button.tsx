"use client";

import { useState } from "react";

export function LogoutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className={
        className ??
        "text-sm text-white/55 transition-colors hover:text-white disabled:opacity-40"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
