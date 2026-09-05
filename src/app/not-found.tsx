import Link from "next/link";

export default function RootNotFound() {
  return (
    <section style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ marginBottom: "10px" }}>Pàgina no trobada</h1>
        <p style={{ color: "#5b6b72" }}>
          <Link href="/" style={{ color: "#276e90", fontWeight: 700 }}>Torna a l&apos;inici</Link>
        </p>
      </div>
    </section>
  );
}
