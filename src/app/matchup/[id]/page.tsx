import { getAdminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { Metadata } from "next";

interface Props { params: { id: string } }

async function getMatchup(id: string) {
  try {
    const doc = await getAdminDb().collection("matchups").doc(id).get();
    if (doc.exists) return doc.data() as any;
  } catch {}
  return null;
}

function findPlayer(id: string) {
  return SEED_PLAYERS.find((p) => p.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [aId, bId] = params.id.split("__");
  const a = findPlayer(aId);
  const b = findPlayer(bId);
  if (!a || !b) return { title: "Check-Up 1v1" };
  const ogUrl = `/api/og?a=${encodeURIComponent(a.name)}&b=${encodeURIComponent(b.name)}&aImg=${encodeURIComponent(a.photo_url)}&bImg=${encodeURIComponent(b.photo_url)}`;
  return {
    title: `${a.name} vs ${b.name} — Check-Up 1v1`,
    description: `Who wins 1v1? Vote now on Check-Up.`,
    openGraph: {
      title: `${a.name} vs ${b.name} — Who Wins?`,
      description: "Settle the debate. Cast your vote on Check-Up 1v1.",
      images: [ogUrl],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function MatchupPage({ params }: Props) {
  const [aId, bId] = params.id.split("__");
  const a = findPlayer(aId);
  const b = findPlayer(bId);
  const matchup = await getMatchup(params.id);

  if (!a || !b) {
    return (
      <main style={{ minHeight: "100dvh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏀</div>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 20, fontFamily: "system-ui" }}>Matchup not found.</p>
          <a href="/" style={{ background: "linear-gradient(135deg,#FF9800,#FF5722)", color: "#000", padding: "12px 24px", borderRadius: 12, fontWeight: 800, textDecoration: "none", fontFamily: "system-ui" }}>
            Go Vote →
          </a>
        </div>
      </main>
    );
  }

  // CTA lands on homepage with these players pre-loaded
  const voteUrl = `/?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`;

  return (
    <main style={{ minHeight: "100dvh", background: "#0A0A0A", display: "flex", flexDirection: "column", fontFamily: "'Montserrat', system-ui, sans-serif" }}>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg,#1A1A1A 0%,#0F0F0F 100%)",
        flexShrink: 0,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/checkup_btn.png" alt="Check-Up" width={32} height={32}
            style={{ borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 8px rgba(255,152,0,0.5)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/checkup_main.png" alt="Check-Up 1V1" height={24}
            style={{ objectFit: "contain", maxWidth: 120 }} />
        </a>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px",
        }}>
          LIVE DEBATE
        </span>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 480, width: "100%", margin: "0 auto", padding: "16px 16px 24px" }}>

        {/* Subtitle */}
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14, marginTop: 4 }}>
          WHO WINS THIS 1V1?
        </p>

        {/* ── MATCHUP CARDS ─────────────────────────────────────────── */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* Player A */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#111", display: "flex", flexDirection: "column" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.photo_url} alt={a.name}
              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", objectPosition: "top", display: "block" }} />
            <div style={{ padding: "10px 10px 12px", background: "#0D0D0D" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{a.name}</p>
              <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FF9800" }}>{a.category}</p>
            </div>
          </div>

          {/* Player B */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#111", display: "flex", flexDirection: "column" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.photo_url} alt={b.name}
              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", objectPosition: "top", display: "block" }} />
            <div style={{ padding: "10px 10px 12px", background: "#0D0D0D" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{b.name}</p>
              <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FF9800" }}>{b.category}</p>
            </div>
          </div>

          {/* VS badge — sits in the gap between the two cards */}
          <div style={{
            position: "absolute", top: "38%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg,#FF9800,#FF5722)",
            boxShadow: "0 0 16px rgba(255,152,0,0.7), 0 0 32px rgba(255,152,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, color: "#000", letterSpacing: "0.05em",
            zIndex: 10,
          }}>
            VS
          </div>
        </div>

        {/* ── ANALYSIS ──────────────────────────────────────────────── */}
        {matchup?.analysis && (
          <div style={{
            marginTop: 14, borderRadius: 16, padding: "12px 14px",
            background: "#1A1A1A", border: "1px solid rgba(255,152,0,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/checkup_btn.png" alt="" width={18} height={18}
                style={{ borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 5px rgba(255,152,0,0.4)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)" }}>
                Check-Up Analysis
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
              {matchup.analysis}
            </p>
          </div>
        )}

        {/* Community votes bar — if matchup data exists */}
        {matchup && (matchup.aVotes > 0 || matchup.bVotes > 0) && (() => {
          const total = Math.max(1, (matchup.aVotes || 0) + (matchup.bVotes || 0));
          const aPct = Math.round(((matchup.aVotes || 0) / total) * 100);
          const bPct = 100 - aPct;
          return (
            <div style={{ marginTop: 12, borderRadius: 14, padding: "10px 14px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Community Says
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: "#FF9800" }}>{a.name.split(" ")[0]} {aPct}%</span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{bPct}% {b.name.split(" ")[0]}</span>
              </div>
              <div style={{ display: "flex", height: 6, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                <div style={{ width: `${aPct}%`, background: "linear-gradient(90deg,#FF9800,#FF5722)", borderRadius: 6 }} />
              </div>
              <p style={{ margin: "6px 0 0", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                {total} {total === 1 ? "vote" : "votes"} cast
              </p>
            </div>
          );
        })()}

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <a href={voteUrl} style={{
          display: "block", marginTop: 16, textAlign: "center", textDecoration: "none",
          background: "linear-gradient(135deg,#FF9800,#FF5722)",
          color: "#000", borderRadius: 18, padding: "16px",
          fontSize: 18, fontWeight: 900, letterSpacing: "0.06em",
          boxShadow: "0 4px 18px rgba(255,152,0,0.5)",
          textTransform: "uppercase",
        }}>
          🏀 Cast Your Vote
        </a>

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10, fontWeight: 500 }}>
          Tap to vote on this exact matchup
        </p>
      </div>
    </main>
  );
}
