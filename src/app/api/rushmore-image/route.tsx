/**
 * /api/rushmore-image
 *
 * Generates a shareable PNG of the user's Mt. Rushmore server-side using
 * next/og (Satori). Running server-side means player photos are fetched
 * without any browser CORS restrictions — no tainted canvas.
 *
 * Query params (for each of the 4 slots, i = 1-4):
 *   n1, n2, n3, n4   — player names
 *   c1, c2, c3, c4   — player categories
 *   i1, i2, i3, i4   — player photo URLs (url-encoded)
 */
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const W = 800;
const H = 960;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const players = [1, 2, 3, 4].map((n) => ({
    name:     searchParams.get(`n${n}`) ?? "Player",
    category: searchParams.get(`c${n}`) ?? "",
    photo:    searchParams.get(`i${n}`) ?? "",
  }));

  // Orange gradient colours
  const ORANGE  = "#FF9800";
  const DEEP    = "#FF5722";
  const BG      = "#0A0A0A";
  const SURFACE = "#111111";
  const CARD_BG = "#0D0D0D";

  return new ImageResponse(
    (
      <div
        style={{
          width:           W,
          height:          H,
          display:         "flex",
          flexDirection:   "column",
          background:      BG,
          padding:         "36px 28px 24px",
          fontFamily:      "Impact, Arial Black, sans-serif",
        }}
      >
        {/* ── TITLE ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" }}>
              YOUR
            </span>
            <span style={{ fontSize: 52, fontWeight: 900, color: ORANGE, letterSpacing: "0.04em" }}>
              MT. RUSHMORE
            </span>
          </div>
          <span
            style={{
              fontSize:      15,
              color:         "rgba(255,255,255,0.38)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily:    "Arial, sans-serif",
              marginTop:     6,
            }}
          >
            THE 4 YOU BACK WHEN IT COUNTS
          </span>
        </div>

        {/* ── 2 × 2 GRID ────────────────────────────────────────── */}
        <div
          style={{
            display:             "flex",
            flexWrap:            "wrap",
            gap:                 14,
            flex:                1,
          }}
        >
          {players.map((p, i) => (
            <div
              key={i}
              style={{
                width:        "calc(50% - 7px)",
                display:      "flex",
                flexDirection:"column",
                borderRadius: 18,
                overflow:     "hidden",
                border:       `2px solid rgba(255,152,0,0.45)`,
                background:   SURFACE,
                position:     "relative",
              }}
            >
              {/* Photo */}
              {p.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo}
                  width={W / 2 - 21}
                  height={300}
                  style={{
                    objectFit:     "cover",
                    objectPosition:"top center",
                    display:       "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width:           "100%",
                    height:          300,
                    background:      "#1A1A1A",
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    fontSize:        64,
                  }}
                >
                  🏀
                </div>
              )}

              {/* Fade overlay at bottom of photo */}
              <div
                style={{
                  position:   "absolute",
                  left:       0,
                  right:      0,
                  bottom:     52,            // height of name strip
                  height:     100,
                  background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)",
                  display:    "flex",
                }}
              />

              {/* Rank badge */}
              <div
                style={{
                  position:       "absolute",
                  top:            12,
                  left:           12,
                  width:          36,
                  height:         36,
                  borderRadius:   "50%",
                  background:     `linear-gradient(135deg, ${ORANGE}, ${DEEP})`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       18,
                  fontWeight:     900,
                  color:          "#000",
                }}
              >
                {i + 1}
              </div>

              {/* Name strip */}
              <div
                style={{
                  padding:       "9px 13px 10px",
                  background:    CARD_BG,
                  display:       "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize:      20,
                    fontWeight:    900,
                    color:         "#fff",
                    letterSpacing: "0.02em",
                    lineHeight:    1.1,
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize:      12,
                    color:         ORANGE,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    fontFamily:    "Arial, sans-serif",
                    marginTop:     3,
                  }}
                >
                  {p.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── CHECK-UP WATERMARK ─────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            8,
            marginTop:      18,
          }}
        >
          <span
            style={{
              fontSize:      13,
              color:         "rgba(255,255,255,0.25)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily:    "Arial, sans-serif",
            }}
          >
            CHECK-UP 1V1
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
