import { ImageResponse } from "next/og";

export const alt = "Estudia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const tagline: Record<string, string> = {
  ca: "Menys caos. Més temps per aprendre.",
  es: "Menos caos. Más tiempo para aprender.",
  en: "Less chaos. More time to learn.",
};

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          // Matches --background-page / --color-dark in globals.css.
          background: "linear-gradient(160deg, #0a3143 0%, #123f54 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, color: "#ffffff", letterSpacing: -2 }}>
          Estudia
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 500, color: "#9fc4d6" }}>
          {tagline[locale] ?? tagline.ca}
        </div>
      </div>
    ),
    size,
  );
}
