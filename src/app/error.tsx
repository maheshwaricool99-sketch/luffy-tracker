"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PageError]", error?.message);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#f87171" }}>
        Page failed to load
      </h2>
      <p style={{ marginBottom: "1.25rem", color: "#94a3b8", fontSize: "0.875rem", maxWidth: "360px" }}>
        {error?.message || "An unexpected error occurred."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.45rem 1.1rem",
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.45rem 1.1rem",
            background: "transparent",
            color: "#94a3b8",
            border: "1px solid #334155",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Hard Reload
        </button>
      </div>
    </div>
  );
}
