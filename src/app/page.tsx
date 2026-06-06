"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, Era, Category } from "@/lib/types";
import { matchupId, computeStatsEdge } from "@/lib/matchup";
import { recordLocalVote, getLocalVotes } from "@/lib/local";
import { ATTRS } from "@/lib/types";
import { SEED_PLAYERS } from "@/data/players";
import Confetti from "@/components/Confetti";

interface MatchupData {
  matchup_id: string;
  analysis: string;
  aVotes: number;
  bVotes: number;
  videoId: string | null;
}

/** Bolds every occurrence of the winner's name in the AI analysis text */
function highlightWinner(text: string, name: string): React.ReactNode {
  if (!text || !name) return text;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === name.toLowerCase()
      ? <strong key={i} style={{ color: "#FF9800", fontWeight: 800 }}>{p}</strong>
      : p
  );
}

const CATEGORY_TABS = ["ALL", "NBA", "WNBA", "STREETBALL", "FANTASY", "CELEBS"] as const;
type CatTab = typeof CATEGORY_TABS[number];

const CAT_MAP: Record<CatTab, Category | null> = {
  ALL: null,
  NBA: "NBA",
  WNBA: "WNBA",
  STREETBALL: "Streetball Icons",
  FANTASY: "Fantasy",
  CELEBS: "Celebrity Ballers",
};

const ERAS: (Era | "All-Time")[] = ["All-Time", "90s", "2000s", "2010s", "Current"];

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [catTab, setCatTab] = useState<CatTab>("ALL");
  const [era, setEra] = useState<Era | "All-Time">("All-Time");
  const [a, setA] = useState<Player | null>(null);
  const [b, setB] = useState<Player | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [data, setData] = useState<MatchupData | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [king, setKing] = useState<{ name: string; votes: number } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; text: string; upvotes: number }[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read ?a= and ?b= set by the shared matchup page CTA
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const presetAId = urlParams?.get("a") ?? null;
    const presetBId = urlParams?.get("b") ?? null;

    fetch("/api/players")
      .then(r => r.json())
      .then(d => {
        const all: Player[] = d.players && d.players.length > 0 ? d.players : SEED_PLAYERS;
        setPlayers(all);
        // If we arrived from a shared matchup link, lock in those two players
        if (presetAId && presetBId) {
          const pa = all.find(p => p.id === presetAId);
          const pb = all.find(p => p.id === presetBId);
          if (pa && pb) { setA(pa); setB(pb); }
        }
        setLoading(false);
      })
      .catch(() => { setPlayers(SEED_PLAYERS); setLoading(false); });
    const timer = setTimeout(() => {
      setPlayers(prev => prev.length === 0 ? SEED_PLAYERS : prev);
      setLoading(false);
    }, 6000);
    fetch("/api/weekly-king").then(r => r.json()).then(d => setKing(d?.king ?? null)).catch(() => {});
    setVoteCount(getLocalVotes().length);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let pool = players;
    const cat = CAT_MAP[catTab];
    if (cat) pool = pool.filter(p => p.category === cat);
    if (catTab === "ALL" || catTab === "NBA") {
      if (era !== "All-Time") pool = pool.filter(p => p.era === era || p.era === "All-Time");
    }
    return pool;
  }, [players, catTab, era]);

  function pickRandom(pool = filtered) {
    if (pool.length < 2) return;
    const i = Math.floor(Math.random() * pool.length);
    let j = Math.floor(Math.random() * pool.length);
    while (j === i) j = Math.floor(Math.random() * pool.length);
    setA(pool[i]); setB(pool[j]);
    setPicked(null); setData(null);
    setShowComments(false); setComments([]); setCommentText(""); setShowVideo(false); setVotedId(null);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (filtered.length >= 2 && !a) pickRandom(filtered); }, [filtered, a]);

  async function vote(playerId: string) {
    if (!a || !b || voting || picked) return;
    setVoting(true); setPicked(playerId);
    const id = matchupId(a.id, b.id);
    const res = await fetch("/api/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupId: id, playerVotedId: playerId, playerAId: a.id, playerBId: b.id }),
    });
    setData(await res.json());
    recordLocalVote(playerId);
    setVoteCount(c => c + 1);
    setVotedId(playerId);
    setVoting(false);
    setTimeout(() => revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function loadComments(mid: string) {
    const r = await fetch(`/api/comments?matchupId=${mid}`);
    setComments((await r.json()).comments || []);
  }
  async function postComment() {
    if (!commentText.trim() || !data) return;
    await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchupId: data.matchup_id, text: commentText.slice(0, 200) }) });
    setCommentText(""); loadComments(data.matchup_id);
  }
  async function upvote(id: string) {
    await fetch("/api/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (data) loadComments(data.matchup_id);
  }

  const total = data ? Math.max(1, data.aVotes + data.bVotes) : 1;
  const aPct = data ? Math.round((data.aVotes / total) * 100) : 0;
  const bPct = 100 - aPct;
  const pickedPct = picked === a?.id ? aPct : bPct;
  const pickedPlayer = picked ? (picked === a?.id ? a : b) : null;
  const isUnderdog = total >= 5 && pickedPct < 30;
  const edge = a && b ? computeStatsEdge(a, b) : null;
  const statsDisagrees = edge && picked && edge.winnerId !== picked;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/matchup/${data?.matchup_id ?? ""}` : "";
  function share(text: string) {
    if (typeof navigator !== "undefined" && (navigator as any).share) { (navigator as any).share({ url: shareUrl, text }).catch(() => {}); }
    else { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, "_blank"); }
  }

  return (
    <div className="flex h-screen-d flex-col overflow-hidden bg-[#0A0A0A] text-white">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg,#1A1A1A 0%,#0F0F0F 100%)" }}>

        {/* Logo — horizontal Check-Up PNG */}
        <a href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/checkup_btn.png" alt="Check-Up" className="h-9 w-9 rounded-full object-cover shrink-0"
            style={{ boxShadow: "0 0 10px rgba(255,152,0,0.55)" }}
            onError={e => { e.currentTarget.style.display = "none"; }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/checkup_main.png" alt="Check-Up 1V1" className="h-7 w-auto object-contain"
            style={{ maxWidth: 140 }}
            onError={e => {
              // fallback to text if image missing
              const span = document.createElement("span");
              span.className = "font-display text-base tracking-widest";
              span.innerHTML = '<span style="background:linear-gradient(135deg,#FF9800,#FF5722);-webkit-background-clip:text;-webkit-text-fill-color:transparent">CHECK-UP</span> <span style="color:#fff">1V1</span>';
              e.currentTarget.replaceWith(span);
            }} />
        </a>

        {/* Right side: Mt Rushmore shortcut + vote count */}
        <div className="flex items-center gap-2">
          {/* Mt. Rushmore — always visible in header */}
          <a href="/rushmore"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,rgba(255,152,0,0.18),rgba(255,87,34,0.1))", border: "1px solid rgba(255,152,0,0.4)", color: "#FF9800" }}>
            🏀 Rushmore
          </a>
          {king && (
            <span className="hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider sm:flex"
              style={{ background: "rgba(255,152,0,0.1)", border: "1px solid rgba(255,152,0,0.25)", color: "#FF9800" }}>
              👑 {king.name}
            </span>
          )}
          <span className="rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {voteCount} 🗳
          </span>
        </div>
      </header>

      {/* ── CATEGORY TABS ──────────────────────────────────────────────────── */}
      <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setCatTab(tab); setA(null); setEra("All-Time"); }}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95"
            style={catTab === tab
              ? { background: "linear-gradient(135deg,#FF9800 0%,#FF5722 100%)", boxShadow: "0 2px 10px rgba(255,152,0,0.4)", color: "#000" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── ERA SUB-FILTER ─────────────────────────────────────────────────── */}
      {(catTab === "ALL" || catTab === "NBA") && (
        <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto px-3 py-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {ERAS.map(e => (
            <button
              key={e}
              onClick={() => { setEra(e); setA(null); }}
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95"
              style={era === e
                ? { background: "rgba(255,152,0,0.15)", border: "1px solid rgba(255,152,0,0.4)", color: "#FF9800" }
                : { color: "rgba(255,255,255,0.35)" }
              }
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 min-h-0 flex-col">

        {/* ── PICKING STATE ──────────────────────────────────────────────── */}
        {!picked && (
          <>
            <div className="shrink-0 px-4 pt-3 pb-1 text-center">
              <h1 className="font-display text-2xl tracking-wider sm:text-3xl">
                WHO WINS?{" "}
                <span style={{ background: "linear-gradient(135deg,#FF9800,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>1V1?</span>
              </h1>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                {catTab !== "ALL" ? catTab : "All players"} · tap to vote
              </p>
            </div>

            {loading && (
              <div className="flex flex-1 items-center justify-center text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                Loading…
              </div>
            )}
            {!loading && filtered.length < 2 && (
              <div className="flex flex-1 items-center justify-center text-center text-sm font-medium px-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                Not enough players in this filter. Try a different era or category.
              </div>
            )}

            {!loading && a && b && (
              <div className="relative flex flex-1 min-h-0 gap-2 px-2 pb-2">
                <PickCard player={a} onVote={() => vote(a.id)} voting={voting} />
                {/* VS badge */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div className="vs-badge flex h-11 w-11 items-center justify-center rounded-full font-display text-sm sm:h-14 sm:w-14 sm:text-xl"
                    style={{
                      background: "linear-gradient(135deg,#1A1A1A,#0A0A0A)",
                      border: "2px solid #FF9800",
                      color: "#FF9800",
                      boxShadow: "0 0 14px rgba(255,152,0,0.5)",
                    }}>
                    VS
                  </div>
                </div>
                <PickCard player={b} onVote={() => vote(b.id)} voting={voting} />
              </div>
            )}
          </>
        )}

        {/* ── VOTED STATE ────────────────────────────────────────────────── */}
        {picked && a && b && pickedPlayer && (
          <div className="flex flex-1 min-h-0 flex-col">

            {/* Mini strip — shows instantly */}
            <div ref={revealRef} className="flex shrink-0 items-center gap-2 px-3 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(26,26,26,0.8)" }}>
              <MiniCard player={a} won={picked === a.id} pct={data ? aPct : (picked === a.id ? 100 : 0)} loading={!data} />
              <div className="font-display text-sm" style={{ color: "#FF9800" }}>VS</div>
              <MiniCard player={b} won={picked === b.id} pct={data ? bPct : (picked === b.id ? 100 : 0)} loading={!data} />
              {isUnderdog && (
                <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{ border: "1px solid rgba(255,152,0,0.6)", background: "rgba(255,152,0,0.1)", color: "#FF9800" }}>
                  🔥 Underdog
                </span>
              )}
            </div>

            {/* Scrollable results */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 px-3 py-3">

              {/* Community vote */}
              <div className="rounded-2xl p-3" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Community Vote
                </p>
                {!data ? (
                  <div className="space-y-2">
                    <div className="h-5 rounded-lg shimmer" />
                    <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="animate-pulse rounded-full" style={{ width: "50%", background: "rgba(255,152,0,0.35)" }} />
                    </div>
                    <p className="text-center text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>tallying votes…</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between font-display text-base sm:text-xl mb-1.5">
                      <span style={picked === a.id ? { background: "linear-gradient(135deg,#FF9800,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : { color: "rgba(255,255,255,0.4)" }}>
                        {a.name.split(" ")[0]} {aPct}%
                      </span>
                      <span style={picked === b.id ? { background: "linear-gradient(135deg,#FF9800,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : { color: "rgba(255,255,255,0.4)" }}>
                        {bPct}% {b.name.split(" ")[0]}
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="animate-grow" style={{ width: `${aPct}%`, background: "linear-gradient(90deg,#FF9800,#FF5722)" }} />
                      <div className="animate-grow" style={{ width: `${bPct}%`, background: "rgba(255,255,255,0.2)" }} />
                    </div>
                    <p className="mt-1 text-center text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {data.aVotes + data.bVotes} total votes
                    </p>
                  </>
                )}
              </div>

              {/* Check-Up Analysis — shown FIRST so you know the verdict before the stats */}
              <div className="rounded-2xl p-3" style={{ background: "#1A1A1A", border: "1px solid rgba(255,152,0,0.18)" }}>
                <div className="mb-1.5 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/checkup_btn.png" alt="" className="h-5 w-5 rounded-full object-cover"
                    style={{ boxShadow: "0 0 6px rgba(255,152,0,0.4)" }}
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Check-Up Analysis
                  </p>
                </div>
                {!data ? (
                  <div className="space-y-2">
                    <div className="h-4 rounded-lg shimmer w-full" />
                    <div className="h-4 rounded-lg shimmer w-5/6" />
                    <div className="h-4 rounded-lg shimmer w-4/6" />
                  </div>
                ) : (
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {highlightWinner(
                      data.analysis,
                      edge ? (edge.winnerId === a!.id ? a!.name : b!.name) : ""
                    )}
                  </p>
                )}
              </div>

              {/* Head to head stats */}
              <div className="rounded-2xl p-3" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Head to Head
                </p>
                <div className="space-y-2">
                  {ATTRS.map(k => {
                    const av = a[k] as number, bv = b[k] as number, aWins = av >= bv;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-0.5">
                          <span style={aWins ? { color: "#FF9800" } : { color: "rgba(255,255,255,0.3)" }}>{av}</span>
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>{k.replace("_", " ")}</span>
                          <span style={!aWins ? { color: "#FF9800" } : { color: "rgba(255,255,255,0.3)" }}>{bv}</span>
                        </div>
                        <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="animate-grow rounded-full" style={{ width: `${(av/(av+bv))*100}%`, background: aWins ? "linear-gradient(90deg,#FF9800,#FF5722)" : "rgba(255,255,255,0.18)" }} />
                          <div className="animate-grow rounded-full" style={{ width: `${(bv/(av+bv))*100}%`, background: !aWins ? "linear-gradient(90deg,#FF9800,#FF5722)" : "rgba(255,255,255,0.18)" }} />
                        </div>
                      </div>
                    );
                  })}
                  {edge && (
                    <p className="mt-2 text-center text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Numbers favor{" "}
                      <span style={{ color: "#FF9800", fontWeight: 700 }}>
                        {edge.winnerId === a.id ? a.name : b.name}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => share(`I got ${pickedPlayer.name} in this 1v1${data ? ` (${pickedPct}% agree)` : ""}. Who you taking? Check-Up 1v1`)}
                  className="btn-cu-outline flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider"
                >
                  🔗 Share
                </button>
                {statsDisagrees && (
                  <button
                    onClick={() => share(`Stats say no but I still got ${pickedPlayer.name} — fight me. Check-Up 1v1`)}
                    className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{ border: "1px solid rgba(255,152,0,0.5)", color: "#FF9800", background: "rgba(255,152,0,0.08)" }}
                  >
                    Fight me 🔥
                  </button>
                )}
                {data?.videoId && (
                  <button
                    onClick={() => setShowVideo(v => !v)}
                    className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.04)" }}
                  >
                    {showVideo ? "▲ Hide" : "▶ Highlights"}
                  </button>
                )}
              </div>

              {showVideo && data?.videoId && (
                <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                  <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${data.videoId}?autoplay=1`} title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              )}

              {/* Trash talk */}
              <button
                onClick={() => { setShowComments(v => !v); if (!showComments && data) loadComments(data.matchup_id); }}
                className="w-full rounded-2xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {showComments ? "▲ Hide" : `💬 Trash Talk${comments.length > 0 && !showComments ? ` (${comments.length})` : ""}`}
              </button>

              {showComments && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && postComment()}
                      placeholder="Your take…"
                      maxLength={200}
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none font-medium"
                      style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,152,0,0.6)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                    <button
                      onClick={postComment}
                      disabled={!commentText.trim()}
                      className="btn-cu rounded-xl px-4 py-2 text-xs disabled:opacity-40"
                    >
                      POST
                    </button>
                  </div>
                  {comments.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-sm font-medium">{c.text}</span>
                      <button
                        onClick={() => upvote(c.id)}
                        className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg,#FF9800,#FF5722)"; e.currentTarget.style.color = "#000"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                      >
                        🔥 {c.upvotes}
                      </button>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-center font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>No takes yet. Drop yours.</p>
                  )}
                </div>
              )}

              {/* Mt. Rushmore promo */}
              {voteCount >= 10 && (
                <a href="/rushmore"
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all active:scale-[0.99]"
                  style={{ border: "1px solid rgba(255,152,0,0.3)", background: "rgba(255,152,0,0.08)" }}>
                  <div>
                    <div className="font-display text-base" style={{ color: "#FF9800" }}>🏔 Your Mt. Rushmore</div>
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {voteCount} votes deep — lock in your top 4
                    </div>
                  </div>
                  <span style={{ color: "#FF9800" }}>→</span>
                </a>
              )}

              <div className="h-1" />
            </div>

            {/* ── STICKY NEXT BUTTON ─────────────────────────────────────── */}
            <div className="shrink-0 px-3 py-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg,#0F0F0F 0%,#0A0A0A 100%)" }}>
              <button
                onClick={() => pickRandom()}
                className="btn-cu animate-orange-pulse w-full rounded-2xl py-3.5 font-display text-xl tracking-wider"
              >
                NEXT MATCHUP →
              </button>
            </div>
          </div>
        )}
      </div>

      <Confetti votedId={votedId} />
    </div>
  );
}

/* ── PickCard ──────────────────────────────────────────────────────────────── */
function PickCard({ player, onVote, voting }: { player: Player; onVote: () => void; voting: boolean }) {
  return (
    <button
      onClick={onVote}
      disabled={voting}
      className="group relative flex-1 overflow-hidden rounded-2xl transition-all active:scale-[0.97] disabled:opacity-80"
      style={{
        border: "1px solid rgba(255,255,255,0.09)",
        background: "#1A1A1A",
      }}
      onMouseEnter={e => { if (!voting) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,152,0,0.45)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(255,152,0,0.15)"; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={player.photo_url}
        alt={player.name}
        className="h-full w-full object-cover object-top"
        onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=600&background=FF9800&color=0A0A0A&bold=true&font-size=0.35`; }}
      />
      {/* Deep gradient overlay — matches app's card overlay pattern */}
      <div className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 50%, transparent 100%)" }} />

      <div className="absolute inset-x-0 bottom-0 p-3 text-left">
        {/* Category + era chips */}
        <div className="mb-1.5 flex flex-wrap gap-1">
          <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
            style={{ background: "linear-gradient(135deg,#FF9800,#FF5722)", color: "#000" }}>
            {player.category}
          </span>
          <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.9)" }}>
            {player.era}
          </span>
        </div>

        {/* Name */}
        <div className="font-display text-xl leading-tight sm:text-3xl">{player.name}</div>

        {/* Bio */}
        <p className="mt-0.5 line-clamp-2 text-[10px] sm:text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          {player.bio}
        </p>

        {/* TAP TO PICK CTA — gradient pill like app FAB */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "linear-gradient(135deg,#FF9800,#FF5722)", boxShadow: "0 3px 10px rgba(255,152,0,0.45)", color: "#000" }}>
          🏀 TAP TO PICK
        </div>
      </div>
    </button>
  );
}

/* ── MiniCard ──────────────────────────────────────────────────────────────── */
function MiniCard({ player, won, pct, loading }: { player: Player; won: boolean; pct: number; loading?: boolean }) {
  return (
    <div
      className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-xl p-1.5 transition-all"
      style={won
        ? { border: "1px solid rgba(255,152,0,0.5)", background: "rgba(255,152,0,0.1)", boxShadow: "0 2px 8px rgba(255,152,0,0.2)" }
        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(26,26,26,0.6)", opacity: 0.6 }
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={player.photo_url}
        alt={player.name}
        className="h-9 w-9 shrink-0 rounded-lg object-cover object-top"
        onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=80&background=FF9800&color=0A0A0A&bold=true`; }}
      />
      <div className="min-w-0">
        <div className="truncate font-display text-sm leading-tight"
          style={won ? { color: "#FF9800" } : { color: "rgba(255,255,255,0.5)" }}>
          {player.name}
        </div>
        {loading ? (
          <div className="h-3 w-8 rounded shimmer mt-0.5" />
        ) : (
          <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{pct}%</div>
        )}
      </div>
      {won && <span className="ml-auto shrink-0 text-sm" style={{ color: "#FF9800" }}>✓</span>}
    </div>
  );
}
