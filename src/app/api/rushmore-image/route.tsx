/**
 * /api/rushmore-image
 * Server-side PNG via next/og (Satori). No browser CORS — photos fetched server-side.
 *
 * Query params (i = 1-4):
 *   n1-n4  player name
 *   c1-c4  player category
 *   i1-i4  photo URL (url-encoded)
 *
 * Satori CSS rules observed here:
 *   - NO calc() — use explicit px
 *   - NO shorthand padding — use paddingTop/Left/Right/Bottom
 *   - flexWrap unreliable — use explicit row divs for the 2×2 grid
 *   - objectPosition: "top" (not "top center")
 */
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ── Canvas dimensions ──────────────────────────────────────────────────────
const W        = 800;
const H        = 960;
const PAD_H    = 28;   // horizontal padding
const PAD_T    = 36;   // top padding
const PAD_B    = 24;   // bottom padding
const GAP      = 14;   // gap between cards
// Card width: (800 - 28*2 - 14) / 2 = 365
const CARD_W   = 365;
const PHOTO_H  = 292;  // photo portion of each card
const STRIP_H  = 56;   // name strip at bottom

// ── Colours ────────────────────────────────────────────────────────────────
const ORANGE = "#FF9800";
const DEEP   = "#FF5722";
const BG     = "#0A0A0A";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const players = [1, 2, 3, 4].map((n) => ({
    name:     searchParams.get(`n${n}`) ?? "Player",
    category: searchParams.get(`c${n}`) ?? "",
    photo:    searchParams.get(`i${n}`) ?? "",
  }));

  // ── Render one card cell ─────────────────────────────────────────────────
  const card = (p: { name: string; category: string; photo: string }, rank: number) => (
    <div
      style={{
        width:         CARD_W,
        display:       "flex",
        flexDirection: "column",
        borderRadius:  18,
        overflow:      "hidden",
        border:        "2px solid rgba(255,152,0,0.45)",
        background:    "#111111",
        position:      "relative",
        flexShrink:    0,
      }}
    >
      {/* ── Photo ────────────────────────────────────────────────── */}
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo}
          width={CARD_W}
          height={PHOTO_H}
          style={{ objectFit: "cover", objectPosition: "top", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: CARD_W, height: PHOTO_H,
            background: "#1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64,
          }}
        >
          🏀
        </div>
      )}

      {/* ── Photo → strip fade overlay ───────────────────────────── */}
      <div
        style={{
          position:   "absolute",
          left:       0, right: 0,
          bottom:     STRIP_H,
          height:     90,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          display:    "flex",
        }}
      />

      {/* ── Rank badge ───────────────────────────────────────────── */}
      <div
        style={{
          position:        "absolute",
          top:             10,
          left:            10,
          width:           36,
          height:          36,
          borderRadius:    "50%",
          background:      `linear-gradient(135deg, ${ORANGE}, ${DEEP})`,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          fontSize:        18,
          fontWeight:      900,
          color:           "#000",
        }}
      >
        {rank}
      </div>

      {/* ── Name strip ───────────────────────────────────────────── */}
      <div
        style={{
          width:         CARD_W,
          height:        STRIP_H,
          paddingTop:    9,
          paddingLeft:   13,
          paddingRight:  13,
          paddingBottom: 10,
          background:    "#0D0D0D",
          display:       "flex",
          flexDirection: "column",
          flexShrink:    0,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "0.02em", lineHeight: 1.1 }}>
          {p.name}
        </span>
        <span style={{ fontSize: 12, color: ORANGE, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 3 }}>
          {p.category}
        </span>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width:         W,
          height:        H,
          display:       "flex",
          flexDirection: "column",
          background:    BG,
          paddingTop:    PAD_T,
          paddingLeft:   PAD_H,
          paddingRight:  PAD_H,
          paddingBottom: PAD_B,
        }}
      >
        {/* ── Title ─────────────────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            marginBottom:   22,
            flexShrink:     0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 50, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" }}>
              YOUR
            </span>
            <span style={{ fontSize: 50, fontWeight: 900, color: ORANGE, letterSpacing: "0.04em" }}>
              MT. RUSHMORE
            </span>
          </div>
          <span
            style={{
              fontSize:      14,
              color:         "rgba(255,255,255,0.38)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop:     6,
            }}
          >
            THE 4 YOU BACK WHEN IT COUNTS
          </span>
        </div>

        {/* ── Row 1 ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "row", gap: GAP, marginBottom: GAP, flexShrink: 0 }}>
          {card(players[0], 1)}
          {card(players[1], 2)}
        </div>

        {/* ── Row 2 ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "row", gap: GAP, flexShrink: 0 }}>
          {card(players[2], 3)}
          {card(players[3], 4)}
        </div>

        {/* ── Watermark ─────────────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            flex:           1,
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            CHECK-UP 1V1
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
