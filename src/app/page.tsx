"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

const CATEGORY_TABS = ["ALL", "NBA", "STREETBALL", "FANTASY", "CELEBS"] as const;
type CatTab = typeof CATEGORY_TABS[number];

const CAT_MAP: Record<CatTab, Category | null> = {
  ALL: null,
  NBA: "NBA",
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
    fetch("/api/players")
      .then(r => r.json())
      .then(d => { setPlayers(d.players && d.players.length > 0 ? d.players : SEED_PLAYERS); setLoading(false); })
      .catch(() => { setPlayers(SEED_PLAYERS); setLoading(false); });
    const timer = setTimeout(() => { setPlayers(prev => prev.length === 0 ? SEED_PLAYERS : prev); setLoading(false); }, 6000);
    return () => clearTimeout(timer);
    fetch("/api/weekly-king").then(r => r.json()).then(d => setKing(d?.king ?? null)).catch(() => {});
    setVoteCount(getLocalVotes().length);
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

  useEffect(() => { if (filtered.length >= 2 && !a) pickRandom(); }, [filtered]);

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
    <div className="flex h-screen-d flex-col overflow-hidden bg-checkup-black text-white">
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
        <a href="/" className="font-display text-xl tracking-wider">
          <span className="text-checkup-orange">CHECK-UP</span> <span>1V1</span>
        </a>
        <div className="flex items-center gap-2">
          {king && <span className="hidden text-[10px] tracking-wider text-checkup-orange sm:block">👑 {king.name}</span>}
          <a href="/submit" className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] tracking-wider text-white/40 hover:text-checkup-orange">+ Add Players</a>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] tracking-wider text-white/40">{voteCount} votes</span>
        </div>
      </header>

      {/* CATEGORY TABS */}
      <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 px-3 py-2">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setCatTab(tab); setA(null); setEra("All-Time"); }}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all ${catTab === tab ? "bg-checkup-orange text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ERA SUB-FILTER (NBA and ALL only) */}
      {(catTab === "ALL" || catTab === "NBA") && (
        <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-3 py-1.5">
          {ERAS.map(e => (
            <button
              key={e}
              onClick={() => { setEra(e); setA(null); }}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-all ${era === e ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* MAIN */}
      <div className="relative flex flex-1 min-h-0 flex-col">

        {/* ── PICKING STATE ── */}
        {!picked && (
          <>
            <div className="shrink-0 px-4 pt-2 pb-1 text-center">
              <h1 className="font-display text-2xl tracking-wider sm:text-3xl">
WHO WINS? <span className="text-checkup-orange">1V1?</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-white/30">
                {catTab !== "ALL" ? catTab : "All players"} · tap to vote
              </p>
            </div>
            {loading && <div className="flex flex-1 items-center justify-center text-white/40">Loading…</div>}
            {!loading && filtered.length < 2 && (
              <div className="flex flex-1 items-center justify-center text-center text-white/40 text-sm px-8">
                Not enough players in this filter. Try a different era or category.
              </div>
            )}
            {!loading && a && b && (
              <div className="relative flex flex-1 min-h-0 gap-1.5 px-2 pb-2">
                <PickCard player={a} onVote={() => vote(a.id)} voting={voting} />
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-checkup-orange bg-checkup-black font-display text-sm text-checkup-orange shadow-xl sm:h-14 sm:w-14 sm:text-xl">VS</div>
                </div>
                <PickCard player={b} onVote={() => vote(b.id)} voting={voting} />
              </div>
            )}
          </>
        )}

        {/* ── VOTED STATE ── show immediately on pick; data fills in async */}
        {picked && a && b && pickedPlayer && (
          <div className="flex flex-1 min-h-0 flex-col">
            {/* Mini player strip — shows instantly */}
            <div ref={revealRef} className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
              <MiniCard player={a} won={picked === a.id} pct={data ? aPct : (picked === a.id ? 100 : 0)} loading={!data} />
              <div className="font-display text-sm text-checkup-orange">VS</div>
              <MiniCard player={b} won={picked === b.id} pct={data ? bPct : (picked === b.id ? 100 : 0)} loading={!data} />
              {isUnderdog && (
                <span className="ml-auto shrink-0 rounded-full border border-checkup-orange/60 bg-checkup-orange/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-checkup-orange">🔥 Underdog</span>
              )}
            </div>

            {/* Scrollable reveal */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 px-3 py-3">

              {/* Community % — skeleton while loading */}
              <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Community vote</p>
                {!data ? (
                  <div className="space-y-2">
                    <div className="h-5 animate-pulse rounded bg-white/10" />
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="animate-pulse bg-checkup-orange/40" style={{ width: "50%" }} />
                    </div>
                    <p className="text-center text-[10px] text-white/20">tallying votes…</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between font-display text-base sm:text-xl mb-1">
                      <span className={picked === a.id ? "text-checkup-orange" : "text-white/50"}>{a.name.split(" ")[0]} {aPct}%</span>
                      <span className={picked === b.id ? "text-checkup-orange" : "text-white/50"}>{bPct}% {b.name.split(" ")[0]}</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="animate-grow bg-checkup-orange" style={{ width: `${aPct}%` }} />
                      <div className="animate-grow bg-white/25" style={{ width: `${bPct}%` }} />
                    </div>
                    <p className="mt-1 text-center text-[10px] text-white/30">{data.aVotes + data.bVotes} total votes</p>
                  </>
                )}
              </div>

              {/* Stat bars — available immediately from player objects */}
              <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Head to head</p>
                <div className="space-y-1.5">
                  {ATTRS.map(k => {
                    const av = a[k] as number, bv = b[k] as number, aWins = av >= bv;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[9px] uppercase tracking-wider mb-0.5">
                          <span className={aWins ? "text-checkup-orange font-bold" : "text-white/35"}>{av}</span>
                          <span className="text-white/35">{k.replace("_", " ")}</span>
                          <span className={!aWins ? "text-checkup-orange font-bold" : "text-white/35"}>{bv}</span>
                        </div>
                        <div className="flex h-1 overflow-hidden rounded-full bg-white/10">
                          <div className={`animate-grow ${aWins ? "bg-checkup-orange" : "bg-white/20"}`} style={{ width: `${(av/(av+bv))*100}%` }} />
                          <div className={`animate-grow ${!aWins ? "bg-checkup-orange" : "bg-white/20"}`} style={{ width: `${(bv/(av+bv))*100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {edge && <p className="mt-1.5 text-center text-[10px] text-white/40">Numbers favor <span className="font-bold text-checkup-orange">{edge.winnerId === a.id ? a.name : b.name}</span></p>}
                </div>
              </div>

              {/* Analysis — skeleton while loading, real text when ready */}
              <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Check-Up Analysis</p>
                {!data ? (
                  <div className="space-y-2">
                    <div className="h-4 animate-pulse rounded bg-white/10 w-full" />
                    <div className="h-4 animate-pulse rounded bg-white/10 w-5/6" />
                    <div className="h-4 animate-pulse rounded bg-white/10 w-4/6" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{data.analysis}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => share(`I got ${pickedPlayer.name} in this 1v1${data ? ` (${pickedPct}% agree)` : ""}. Who you taking? Check-Up 1v1`)}
                  className="flex-1 rounded-xl border border-white/20 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/5 active:scale-95">
                  Share
                </button>
                {statsDisagrees && (
                  <button onClick={() => share(`Stats say no but I still got ${pickedPlayer.name} — fight me. Check-Up 1v1`)}
                    className="flex-1 rounded-xl border border-checkup-orange/50 py-2 text-[11px] font-bold uppercase tracking-wider text-checkup-orange hover:bg-checkup-orange/10 active:scale-95">
                    Fight me 🔥
                  </button>
                )}
                {data?.videoId && (
                  <button onClick={() => setShowVideo(v => !v)}
                    className="flex-1 rounded-xl border border-white/20 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/5 active:scale-95">
                    {showVideo ? "Hide" : "▶ Highlights"}
                  </button>
                )}
              </div>

              {showVideo && data?.videoId && (
                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${data.videoId}?autoplay=1`} title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              )}

              {/* Trash talk */}
              <button onClick={() => { setShowComments(v => !v); if (!showComments && data) loadComments(data.matchup_id); }}
                className="w-full rounded-xl bg-white/5 py-2 text-[11px] font-bold uppercase tracking-wider text-white/50 hover:bg-white/10 active:scale-95">
                {showComments ? "▲ Hide" : `💬 Trash Talk${comments.length > 0 && !showComments ? ` (${comments.length})` : ""}`}
              </button>

              {showComments && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && postComment()}
                      placeholder="Your take…" maxLength={200}
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-checkup-orange" />
                    <button onClick={postComment} disabled={!commentText.trim()}
                      className="rounded-lg bg-checkup-orange px-3 py-2 text-xs font-bold text-black disabled:opacity-40">POST</button>
                  </div>
                  {comments.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                      <span className="text-sm">{c.text}</span>
                      <button onClick={() => upvote(c.id)} className="ml-2 shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs hover:bg-checkup-orange hover:text-black">🔥 {c.upvotes}</button>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-xs text-white/30 text-center">No takes yet. Drop yours.</p>}
                </div>
              )}

              {voteCount >= 10 && (
                <a href="/rushmore" className="flex items-center justify-between rounded-xl border border-checkup-orange/30 bg-checkup-orange/10 px-4 py-3 hover:bg-checkup-orange/15">
                  <div>
                    <div className="font-display text-base text-checkup-orange">🏔 Your Mt. Rushmore</div>
                    <div className="text-[10px] text-white/50">{voteCount} votes deep — lock in your top 4</div>
                  </div>
                  <span className="text-checkup-orange">→</span>
                </a>
              )}
              <div className="h-1" />
            </div>

            {/* STICKY NEXT BUTTON */}
            <div className="shrink-0 border-t border-white/10 bg-checkup-black px-3 py-2">
              <button onClick={() => pickRandom()}
                className="w-full rounded-xl bg-checkup-orange py-3 font-display text-xl tracking-wider text-black transition-all active:scale-95 hover:brightness-110">
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

function PickCard({ player, onVote, voting }: { player: Player; onVote: () => void; voting: boolean }) {
  return (
    <button onClick={onVote} disabled={voting}
      className="group relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] transition-all active:scale-[0.97] hover:border-checkup-orange/40 disabled:opacity-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover object-top"
        onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=600&background=F9A825&color=1E1E1E&bold=true&font-size=0.35`; }} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-left">
        <div className="mb-1 flex flex-wrap gap-1">
          <span className="rounded-full bg-checkup-orange px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-black">{player.category}</span>
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">{player.era}</span>
        </div>
        <div className="font-display text-xl leading-tight sm:text-3xl">{player.name}</div>
        <p className="mt-0.5 line-clamp-2 text-[10px] text-white/60 sm:text-xs">{player.bio}</p>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-checkup-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
          TAP TO PICK
        </div>
      </div>
    </button>
  );
}

function MiniCard({ player, won, pct, loading }: { player: Player; won: boolean; pct: number; loading?: boolean }) {
  return (
    <div className={`flex flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-lg border p-1.5 transition-all ${won ? "border-checkup-orange bg-checkup-orange/10" : "border-white/10 opacity-50"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={player.photo_url} alt={player.name} className="h-9 w-9 shrink-0 rounded-md object-cover object-top"
        onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=80&background=F9A825&color=1E1E1E&bold=true`; }} />
      <div className="min-w-0">
        <div className={`truncate font-display text-sm leading-tight ${won ? "text-checkup-orange" : "text-white/50"}`}>{player.name}</div>
        {loading ? (
          <div className="h-3 w-8 animate-pulse rounded bg-white/10 mt-0.5" />
        ) : (
          <div className="text-[10px] text-white/40">{pct}%</div>
        )}
      </div>
      {won && <span className="ml-auto shrink-0 text-checkup-orange">✓</span>}
    </div>
  );
}
