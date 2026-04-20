"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error?.message, error?.digest);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          background: "#090f17",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "#f87171", fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ marginBottom: "0.5rem", color: "#94a3b8", fontSize: "0.875rem" }}>
            {error?.digest
              ? "A server error occurred."
              : "A client-side error occurred — likely a stale browser cache."}
          </p>
          <p style={{ marginBottom: "1.5rem", color: "#64748b", fontSize: "0.8rem" }}>
            Click Reload to clear the issue. If it persists, clear your browser cache (Ctrl+Shift+Delete).
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.55rem 1.5rem",
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Reload
          </button>
          {error?.digest && (
            <p style={{ marginTop: "1.5rem", color: "#475569", fontSize: "0.75rem" }}>
              Error: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
