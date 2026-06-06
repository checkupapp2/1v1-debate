import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { computeStatsEdge } from "@/lib/matchup";
import { fetchYouTubeVideoId } from "@/lib/youtube";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

type Attr = "handles" | "scoring" | "quickness" | "heart" | "court_iq";
const ATTRS: Attr[] = ["handles", "scoring", "quickness", "heart", "court_iq"];

// Rich stat-to-basketball phrase maps
const STAT_NOUN: Record<Attr, string> = {
  handles: "handle", scoring: "bucket-getting", quickness: "first step",
  heart: "dog in him", court_iq: "IQ",
};
const STAT_PHRASE: Record<Attr, string> = {
  handles: "with the ball in his hands", scoring: "getting buckets off the dribble",
  quickness: "beating his man off the bounce", heart: "when the game's on the line",
  court_iq: "reading the defense",
};
const STAT_ADJ: Record<Attr, string> = {
  handles: "shifty", scoring: "bucket-getter", quickness: "explosive",
  heart: "cold-blooded", court_iq: "heady",
};

// Category-specific context phrases
const CAT_CONTEXT: Record<string, string[]> = {
  "NBA": ["in a half-court iso set", "in a playoff isolation", "in a pick-your-poison 1v1", "off the bounce in a lockdown situation"],
  "Streetball Icons": ["on the blacktop", "in an open gym battle", "when the crowd's watching", "in a street run"],
  "Celebrity Ballers": ["in a charity run", "in a pro-am game", "when the cameras are on", "for the culture"],
  "Fantasy": ["at their absolute peak", "in prime form", "in this hypothetical", "across any era"],
};

/** Deterministic pseudo-random index from two player IDs + an offset */
function pick(seed: number, arr: any[], offset = 0): any {
  return arr[(seed + offset) % arr.length];
}

function idHash(a: any, b: any): number {
  return (a.id + b.id).split("").reduce((n: number, c: string) => n + c.charCodeAt(0), 0);
}

/** Rich, deterministic, per-matchup analysis — no two matchups get the same text */
function richFallback(a: any, b: any): string {
  const edge = computeStatsEdge(a, b);
  const winner = edge.winnerId === a.id ? a : b;
  const loser  = edge.winnerId === a.id ? b : a;
  const seed   = idHash(winner, loser);

  // Compute every stat differential
  const diffs = ATTRS.map((k) => ({
    k,
    wv: winner[k] as number,
    lv: loser[k] as number,
    d: (winner[k] as number) - (loser[k] as number),
  }));
  const winLeads = diffs.filter((x) => x.d > 0).sort((x, y) => y.d - x.d); // winner's best edges
  const loseLeads = diffs.filter((x) => x.d < 0).sort((x, y) => x.d - y.d); // loser's best stats

  const top1 = winLeads[0];
  const top2 = winLeads[1];
  const lTop = loseLeads[0]; // loser's biggest advantage

  // Pull the first clause of each player's bio as a flavor snippet
  const wBio = winner.bio.split(/[.,]/)[0].trim();
  const lBio = loser.bio.split(/[.,]/)[0].trim();

  const ctx = pick(seed, CAT_CONTEXT[winner.category] || CAT_CONTEXT["NBA"]);

  // 9 different opener templates
  const openers = [
    // 0 — lead with the concrete stat gap
    top1
      ? `${winner.name} has the edge ${ctx} — their ${STAT_NOUN[top1.k]} (${top1.wv}/10 vs ${top1.lv}/10) is the separator.`
      : `${winner.name} has the edge ${ctx} across the board.`,
    // 1 — open with bio flavor
    `${wBio} — that's ${winner.name}. ${ctx.charAt(0).toUpperCase() + ctx.slice(1)}, that reputation holds up.${top1 ? ` The ${STAT_NOUN[top1.k]} advantage seals it.` : ""}`,
    // 2 — two-stat edge
    top2
      ? `${winner.name} wins ${ctx}. Their ${STAT_NOUN[top1.k]} and ${STAT_NOUN[top2.k]} give them too many counters to guard.`
      : `${winner.name} is the pick ${ctx} — the skillset is just deeper.`,
    // 3 — actual numbers front and center
    top1
      ? `The ${STAT_NOUN[top1.k]} tells the story: ${winner.name} at ${top1.wv}/10, ${loser.name} at ${top1.lv}/10. ${ctx.charAt(0).toUpperCase() + ctx.slice(1)}, that gap is real.`
      : `${winner.name} edges ${loser.name} across the board ${ctx}.`,
    // 4 — era framing
    `In a pure 1v1 ${ctx}, ${winner.name} (${winner.era}) gets the call over ${loser.name} (${loser.era}).${top1 ? ` The ${STAT_ADJ[top1.k]} game is the difference.` : ""}`,
    // 5 — blunt take
    top1
      ? `${winner.name} ${STAT_PHRASE[top1.k]} better than ${loser.name}. That's the matchup.`
      : `${winner.name} has every tool ${loser.name} has, and then some.`,
    // 6 — close game framing
    `This is close, but give ${winner.name} the nod ${ctx}.${top2 ? ` Their ${STAT_NOUN[top2.k]} is the tiebreaker when it counts.` : " They make the harder shots."}`,
    // 7 — contrast framing
    top1
      ? `Where ${winner.name} separates: ${STAT_PHRASE[top1.k]}. That's ${top1.wv} to ${loser.name}'s ${top1.lv} and it shows ${ctx}.`
      : `${winner.name} vs ${loser.name} ${ctx} — edge goes to ${winner.name}.`,
    // 8 — respect-first opener
    `Both of these guys are problems, but ${winner.name} gets the edge ${ctx}.${top1 ? ` That ${STAT_NOUN[top1.k]} differential (${top1.wv} vs ${top1.lv}) is the deciding factor.` : ""}`,
  ];

  // 7 different closer templates
  const closers = [
    // 0 — acknowledge loser's best stat
    lTop
      ? `${loser.name}'s ${STAT_NOUN[lTop.k]} (${lTop.lv}/10) keeps this competitive, but ${winner.name} has the answers when it gets tough.`
      : `${loser.name} is no pushover — ${winner.name} just has more ways to win.`,
    // 1 — loser bio flavor
    `${lBio} — ${loser.name} is a real threat — but ${winner.name} wins this format.`,
    // 2 — stat credit to loser
    lTop
      ? `${loser.name}'s ${STAT_ADJ[lTop.k]} game (${lTop.lv}/10 ${STAT_NOUN[lTop.k]}) makes this a fight, but ${winner.name} pulls away late.`
      : `${loser.name} makes every possession count. Just not enough of them.`,
    // 3 — blunt closer
    `${loser.name} is a problem — just not the winner here.`,
    // 4 — grudging respect closer
    `Don't sleep on ${loser.name}, but ${winner.name}'s${top1 ? ` ${STAT_NOUN[top1.k]}` : " overall bag"} is the difference in a true 1v1.`,
    // 5 — edge closer
    `${winner.name} by a hair. ${loser.name} makes you earn it, but the edge stays put.`,
    // 6 — era/category closer
    `That's how the ${winner.category === loser.category ? winner.category : "basketball"} debate plays out — ${winner.name} gets the call.`,
  ];

  const opener = pick(seed, openers, 0);
  const closer = pick(seed, closers, 5); // offset 5 so opener and closer templates rarely align
  return `${opener} ${closer}`;
}

/** Build a unique, player-specific analysis using Claude Haiku (on-demand, cached in Firestore). */
async function generateAnalysis(a: any, b: any): Promise<string> {
  const edge = computeStatsEdge(a, b);
  const winner = edge.winnerId === a.id ? a : b;
  const loser  = edge.winnerId === a.id ? b : a;

  // Try Claude first
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== "PASTE_ANTHROPIC_KEY_HERE") {
    try {
      const client = new Anthropic({ apiKey });
      const winnerEdges = ATTRS
        .filter((k) => (winner[k] || 0) > (loser[k] || 0))
        .map((k) => STAT_NOUN[k]);

      const prompt = [
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

      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content?.[0]?.type === "text" ? res.content[0].text.trim() : "";
      if (text.length > 20) return text;
    } catch {
      // fall through to rich fallback
    }
  }

  return richFallback(a, b);
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
    "bag goes deeper in a true 1v1 setting",      // previous template
    "it shows up when shots are contested",       // previous template variant
  ];
  const existingAnalysis: string = matchupSnap.data()?.analysis || "";
  const isGeneric = GENERIC_MARKERS.some((m) => existingAnalysis.includes(m));

  const needsAnalysis =
    !matchupSnap.exists ||
    !existingAnalysis ||
    isGeneric;

  if (needsAnalysis) {
    const edge = computeStatsEdge(a, b);
    const analysis = await generateAnalysis(a, b);
    await matchupRef.set(
      {
        id: matchupId,
        player_a_id: a.id,
        player_b_id: b.id,
        analysis,
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
  const analysis = matchupData?.analysis || (await generateAnalysis(a, b));

  return NextResponse.json({
    matchup_id: matchupId,
    analysis,
    aVotes,
    bVotes,
    videoId,
  });
}
