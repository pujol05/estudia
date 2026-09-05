"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ca">
      <body>
        <section style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 20px" }}>
          <div style={{
            width: "min(480px, 100%)",
            padding: "32px",
            background: "var(--color-white)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            boxShadow: "0 8px 24px rgb(10 49 67 / 8%)",
            textAlign: "center",
          }}>
            <h1 style={{ marginBottom: "10px", color: "var(--color-dark)", fontSize: "24px" }}>
              Alguna cosa ha fallat
            </h1>
            <p style={{ color: "#5b6b72", fontSize: "14px", lineHeight: 1.5 }}>
              Hi ha hagut un error inesperat. Torna-ho a provar.
            </p>
            <div style={{ marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "11px 18px",
                  background: "var(--color-primary)",
                  color: "var(--color-white)",
                  border: 0,
                  borderRadius: "8px",
                  font: "inherit",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Torna-ho a provar
              </button>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
