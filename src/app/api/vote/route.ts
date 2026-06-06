import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { computeStatsEdge } from "@/lib/matchup";
import { fetchYouTubeVideoId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

type Attr = "handles" | "scoring" | "quickness" | "heart" | "court_iq";
const ATTRS: Attr[] = ["handles", "scoring", "quickness", "heart", "court_iq"];

// Rich stat-to-basketball language maps
const STAT_NOUN: Record<Attr, string> = {
  handles:  "handle",
  scoring:  "bucket-getting",
  quickness:"first step",
  heart:    "dog in him",
  court_iq: "IQ",
};
// Full verb clauses — grammatically complete after a player's name
const STAT_VERB: Record<Attr, string> = {
  handles:  "is deadly off the dribble",
  scoring:  "can fill it up from anywhere",
  quickness:"gets by defenders in a blink",
  heart:    "never backs down from a big moment",
  court_iq: "always makes the right read",
};
const STAT_ADJ: Record<Attr, string> = {
  handles:  "shifty",
  scoring:  "elite scorer",
  quickness:"explosive",
  heart:    "cold-blooded",
  court_iq: "heady",
};
// Standalone descriptors used inside sentences
const STAT_EDGE: Record<Attr, string> = {
  handles:  "handle advantage",
  scoring:  "scoring edge",
  quickness:"quickness gap",
  heart:    "clutch factor",
  court_iq: "IQ edge",
};

// Category-specific context phrases
const CAT_CONTEXT: Record<string, string[]> = {
  "NBA":             ["in a half-court iso set", "in a playoff isolation", "in a pick-your-poison 1v1", "when it comes down to one shot"],
  "WNBA":            ["in a WNBA iso set", "in a finals isolation", "in a pick-your-poison 1v1", "when it comes down to one shot"],
  "Streetball Icons":["on the blacktop", "in an open gym battle", "when the crowd's watching", "in a street run"],
  "Celebrity Ballers":["in a charity run", "in a pro-am game", "when the cameras are on", "for the culture"],
  "Fantasy":         ["at their absolute peak", "in prime form", "in this hypothetical matchup", "across any era"],
};

/** Deterministic pseudo-random index from two player IDs + an offset */
function pick(seed: number, arr: any[], offset = 0): any {
  return arr[(seed + offset) % arr.length];
}

function idHash(a: any, b: any): number {
  return (a.id + b.id).split("").reduce((n: number, c: string) => n + c.charCodeAt(0), 0);
}

/** Rich, deterministic, per-matchup analysis — no two matchups get the same sentence structure */
function richFallback(a: any, b: any): string {
  const edge = computeStatsEdge(a, b);
  const winner = edge.winnerId === a.id ? a : b;
  const loser  = edge.winnerId === a.id ? b : a;
  const seed   = idHash(winner, loser);

  // Compute every stat differential
  const diffs = ATTRS.map((k) => ({
    k,
    wv: winner[k] as number,
    lv: loser[k]  as number,
    d:  (winner[k] as number) - (loser[k] as number),
  }));
  const winLeads  = diffs.filter((x) => x.d > 0).sort((x, y) => y.d - x.d);
  const loseLeads = diffs.filter((x) => x.d < 0).sort((x, y) => x.d - y.d);

  const top1 = winLeads[0];
  const top2 = winLeads[1];
  const lTop = loseLeads[0]; // loser's strongest stat vs winner

  // Pull the first clause of each bio for flavor
  const wBio = winner.bio.split(/[.,]/)[0].trim();
  const lBio = loser.bio.split(/[.,]/)[0].trim();

  const ctx = pick(seed, CAT_CONTEXT[winner.category] || CAT_CONTEXT["NBA"]);

  // 9 grammatically clean, structurally distinct openers
  const openers = [
    // 0 — lead with actual stat numbers
    top1
      ? `${winner.name} has the edge ${ctx} — the ${STAT_EDGE[top1.k]} (${top1.wv} vs ${top1.lv}) is the separator.`
      : `${winner.name} takes this ${ctx} across the board.`,

    // 1 — open with bio flavor, close with stat
    `${wBio} — that's ${winner.name}. ${ctx.charAt(0).toUpperCase() + ctx.slice(1)}, that reputation holds up.${top1 ? ` The ${STAT_EDGE[top1.k]} seals it.` : ""}`,

    // 2 — two-stat lead (no "their")
    top2
      ? `${winner.name} wins ${ctx}. The ${STAT_NOUN[top1.k]} plus the ${STAT_NOUN[top2.k]} — too many counters to guard.`
      : `${winner.name} is the pick ${ctx}. The skillset is just deeper.`,

    // 3 — numbers front and center
    top1
      ? `The ${STAT_NOUN[top1.k]} tells the story: ${winner.name} at ${top1.wv}/10, ${loser.name} at ${top1.lv}/10. ${ctx.charAt(0).toUpperCase() + ctx.slice(1)}, that gap is real.`
      : `${winner.name} edges ${loser.name} on balance ${ctx}.`,

    // 4 — era framing
    `In a pure 1v1 ${ctx}, ${winner.name} (${winner.era}) gets the call over ${loser.name} (${loser.era}).${top1 ? ` That ${STAT_ADJ[top1.k]} game is the difference.` : ""}`,

    // 5 — verb-first blunt take (grammatically correct)
    top1
      ? `${winner.name} ${STAT_VERB[top1.k]}, and that's what decides a 1v1. ${loser.name} doesn't have an answer for it.`
      : `${winner.name} has every tool ${loser.name} brings — and then some.`,

    // 6 — close game framing (no "they")
    top2
      ? `This is close, but give ${winner.name} the nod ${ctx}. The ${STAT_NOUN[top2.k]} is the tiebreaker when it counts.`
      : `This is close, but ${winner.name} gets the nod ${ctx}. The harder shots go in.`,

    // 7 — contrast framing (no dangling phrase)
    top1
      ? `Here's where ${winner.name} separates: ${top1.wv}/10 ${STAT_NOUN[top1.k]} versus ${loser.name}'s ${top1.lv}/10. That's the ballgame ${ctx}.`
      : `${winner.name} versus ${loser.name} ${ctx} — the edge belongs to ${winner.name}.`,

    // 8 — respect-first
    `Both of these players are a problem, but ${winner.name} gets the edge ${ctx}.${top1 ? ` That ${STAT_EDGE[top1.k]} (${top1.wv} vs ${top1.lv}) is the deciding factor.` : ""}`,
  ];

  // 7 structurally distinct closers
  const closers = [
    // 0 — acknowledge loser's best
    lTop
      ? `${loser.name}'s ${STAT_NOUN[lTop.k]} (${Math.abs(lTop.lv)}/10) keeps this close, but ${winner.name} has answers when it matters.`
      : `${loser.name} is no pushover — ${winner.name} just has more ways to win.`,

    // 1 — loser bio flavor
    `${lBio} — ${loser.name} is a real threat — but ${winner.name} wins this format.`,

    // 2 — stat credit to loser
    lTop
      ? `${loser.name}'s ${STAT_ADJ[lTop.k]} game (${Math.abs(lTop.lv)}/10 ${STAT_NOUN[lTop.k]}) makes it a fight, but ${winner.name} pulls away late.`
      : `${loser.name} makes every possession count. Just not enough of them.`,

    // 3 — blunt
    `${loser.name} is a problem in any gym. Just not the winner in this one.`,

    // 4 — grudging respect
    `Don't sleep on ${loser.name} — but ${winner.name}'s ${top1 ? STAT_NOUN[top1.k] : "overall bag"} is the difference when it's truly 1v1.`,

    // 5 — edge close
    `${winner.name} wins by a possession. ${loser.name} makes you earn every bucket, but the edge holds.`,

    // 6 — category framing
    `That's the ${winner.category === loser.category ? winner.category : "basketball"} debate settled — ${winner.name} gets the call.`,
  ];

  const opener = pick(seed, openers, 0);
  const closer = pick(seed, closers, 5); // offset 5 so opener + closer rarely share the same template index
  return `${opener} ${closer}`;
}

/** Call OpenRouter (OpenAI-compatible) to generate a unique matchup analysis. */
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_OPENROUTER_KEY") return "";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://1v1.checkupbasketball.com",
        "X-Title": "Check-Up 1v1",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Build the OpenRouter prompt for a matchup. */
function buildPrompt(a: any, b: any, winnerId: string): string {
  const winner = winnerId === a.id ? a : b;
  const winnerEdges = ATTRS
    .filter((k) => (winner[k] || 0) > ((winnerId === a.id ? b : a)[k] || 0))
    .map((k) => STAT_NOUN[k]);
  return [
    `You are Check-Up, a sharp basketball debate platform. Write a 2-3 sentence analysis for a pure isolation 1v1 matchup.`,
    ``,
    `${a.name} (${a.category} · ${a.era}): ${a.bio}`,
    `  Stats — Handles: ${a.handles}/10, Scoring: ${a.scoring}/10, Quickness: ${a.quickness}/10, Heart: ${a.heart}/10, Court IQ: ${a.court_iq}/10`,
    ``,
    `${b.name} (${b.category} · ${b.era}): ${b.bio}`,
    `  Stats — Handles: ${b.handles}/10, Scoring: ${b.scoring}/10, Quickness: ${b.quickness}/10, Heart: ${b.heart}/10, Court IQ: ${b.court_iq}/10`,
    ``,
    `Give the slight edge to ${winner.name}${winnerEdges.length ? ` — their ${winnerEdges.slice(0, 2).join(" and ")} are the difference` : ""}.`,
    `Be specific to these two players. Reference their actual bios and real stat differences. Use real basketball language. No bullet points. Under 65 words.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const { matchupId, playerVotedId, playerAId, playerBId } = await req.json();
  if (!matchupId || !playerVotedId) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  // Look up players (firestore first, fall back to seed)
  async function findPlayer(id: string) {
    try {
      const doc = await getAdminDb().collection("players").doc(id).get();
      if (doc.exists) return doc.data() as any;
    } catch {}
    return SEED_PLAYERS.find((p) => p.id === id);
  }
  const a = await findPlayer(playerAId);
  const b = await findPlayer(playerBId);
  if (!a || !b) return NextResponse.json({ error: "no players" }, { status: 404 });

  // Ensure matchup doc exists with real, unique analysis
  const matchupRef = getAdminDb().collection("matchups").doc(matchupId);
  let matchupSnap = await matchupRef.get();
  // Detect any previously-generated generic/template analysis so it gets regenerated
  const GENERIC_MARKERS = [
    "iso pedigree to finish over contests",       // very old template
    "bag goes deeper in a true 1v1 setting",      // v2 template
    "it shows up when shots are contested",       // v2 template variant
    "with the ball in his hands better than",     // v3 broken grammar template
    "That's how the NBA debate plays out",        // v3 category closer
  ];
  const existingAnalysis: string = matchupSnap.data()?.analysis || "";
  const isGeneric = GENERIC_MARKERS.some((m) => existingAnalysis.includes(m));
  const isFallback = matchupSnap.data()?.ai_generated === false;
  const hasKey = !!(process.env.OPENROUTER_API_KEY?.trim()) &&
    process.env.OPENROUTER_API_KEY !== "PASTE_YOUR_OPENROUTER_KEY";

  // Regenerate if: no doc, no text, old generic text, OR stored as fallback and key is now live
  const needsAnalysis =
    !matchupSnap.exists ||
    !existingAnalysis ||
    isGeneric ||
    (isFallback && hasKey);

  if (needsAnalysis) {
    const edge = computeStatsEdge(a, b);
    const aiText = await callOpenRouter(buildPrompt(a, b, edge.winnerId));
    const isAI = aiText.length > 20;
    const analysis = isAI ? aiText : richFallback(a, b);
    await matchupRef.set(
      {
        id: matchupId,
        player_a_id: a.id,
        player_b_id: b.id,
        analysis,
        ai_generated: isAI,
        stats_edge: edge.winnerId,
        created_at: matchupSnap.exists ? matchupSnap.data()?.created_at : Date.now(),
        updated_at: Date.now(),
      },
      { merge: true },
    );
    matchupSnap = await matchupRef.get();
  }

  // Cache YouTube video for the voted player
  let videoId: string | null = null;
  try {
    const playerRef = getAdminDb().collection("players").doc(playerVotedId);
    const pSnap = await playerRef.get();
    if (pSnap.exists && pSnap.data()?.youtube_video_id) {
      videoId = pSnap.data()!.youtube_video_id;
    } else {
      const voted = await findPlayer(playerVotedId);
      if (voted) {
        videoId = await fetchYouTubeVideoId(voted.youtube_search_query);
        if (videoId) {
          await playerRef.set({ youtube_video_id: videoId }, { merge: true });
        }
      }
    }
  } catch {}

  // Record vote
  try {
    await getAdminDb().collection("votes").add({
      matchup_id: matchupId,
      player_voted_id: playerVotedId,
      created_at: Date.now(),
    });
  } catch {}

  // Tally — wrapped in try/catch so a Firestore hiccup never blocks the response
  let aVotes = 1,
    bVotes = 0; // optimistic: your vote counts at minimum
  if (playerVotedId === b.id) {
    aVotes = 0;
    bVotes = 1;
  }
  try {
    const votesSnap = await getAdminDb()
      .collection("votes")
      .where("matchup_id", "==", matchupId)
      .get();
    aVotes = 0;
    bVotes = 0;
    votesSnap.forEach((d) => {
      const v = d.data();
      if (v.player_voted_id === a.id) aVotes++;
      else if (v.player_voted_id === b.id) bVotes++;
    });
  } catch {}

  const matchupData = matchupSnap.data();
  const analysis = matchupData?.analysis || richFallback(a, b);

  return NextResponse.json({
    matchup_id: matchupId,
    analysis,
    aVotes,
    bVotes,
    videoId,
  });
}
