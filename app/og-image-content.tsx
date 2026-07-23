// Shared visual for opengraph-image.tsx and twitter-image.tsx. `next/og` (satori) renders
// this outside the browser — it can't read `--pa-*` custom properties from globals.css, and
// its color parser doesn't recognize oklch() at all (confirmed against the bundled satori:
// node_modules/next/dist/compiled/@vercel/og has zero "oklch" references and throws on it).
// These hex values are the sRGB conversion of the matching dark-skin --pa-* token, so keep
// them in sync by hand if that token's oklch() value in globals.css ever changes.
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

const APP_BG = "#120f0a"; // --pa-app
const CTA = "#efcc36"; // --pa-cta
const CTA_INK = "#141207"; // --pa-cta-ink
const INK = "#f2efe0"; // --pa-ink
const MUTED = "#8c8579"; // --pa-muted

export function ogImageElement() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: APP_BG,
      }}
    >
      <div style={{ display: "flex", height: 16, background: CTA }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              width: 84,
              height: 84,
              borderRadius: 16,
              background: CTA,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 36,
                height: 36,
                borderRadius: 7,
                background: CTA_INK,
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: INK }}>
            Paddock Atlas
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: INK, opacity: 0.85 }}>
          Jurassic World Evolution 3 park planner
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          Live-scored candidates · derived build order
        </div>
      </div>
      <div style={{ display: "flex", height: 16, background: CTA }} />
    </div>
  );
}
