"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error.tsx wraps the entire app including the root layout.
// Must include <html> and <body>.
export default function GlobalAppError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[global-error boundary]", error.digest ?? "(no digest)", error.message);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div style={{
          display: "flex", minHeight: "100vh", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{
            width: "100%", maxWidth: "28rem", borderRadius: "1rem",
            border: "1px solid #e5e7eb", background: "#fff",
            padding: "2.5rem 2rem", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          }}>
            <div style={{
              width: "3.5rem", height: "3.5rem", borderRadius: "50%",
              background: "#fee2e2", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 1rem",
              fontSize: "1.5rem", color: "#e60000",
            }}>
              ⚠
            </div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#25282b", margin: "0 0 .5rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: ".875rem", color: "#7e7e7e", margin: "0 0 1.5rem" }}>
              A critical error occurred. Please refresh the page or try again later.
            </p>
            {error.digest && (
              <p style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "monospace", margin: "0 0 1.5rem" }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                width: "100%", padding: ".75rem", borderRadius: ".75rem",
                background: "#e60000", color: "#fff", fontWeight: 700,
                fontSize: ".875rem", border: "none", cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
