import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { computeStatsEdge } from "@/lib/matchup";
import { fetchYouTubeVideoId } from "@/lib/youtube";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// Stat attribute labels for the fallback generator
const ATTR_LABELS: Record<string, string> = {
  handles: "ball-handling",
  scoring: "scoring ability",
  quickness: "quickness",
  heart: "heart and competitiveness",
  court_iq: "court IQ",
};

/** Build a unique, player-specific analysis using Claude Haiku (on-demand, cached in Firestore). */
async function generateAnalysis(a: any, b: any): Promise<string> {
  const edge = computeStatsEdge(a, b);
  const winner = edge.winnerId === a.id ? a : b;
  const loser = edge.winnerId === a.id ? b : a;

  // Try Claude first
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== "PASTE_ANTHROPIC_KEY_HERE") {
    try {
      const client = new Anthropic({ apiKey });
      const attrs = ["handles", "scoring", "quickness", "heart", "court_iq"] as const;
      const winnerEdges = attrs
        .filter((k) => (winner[k] || 0) > (loser[k] || 0))
        .map((k) => ATTR_LABELS[k]);

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
        `Be specific to these two players. Use real basketball language. No bullet points. Under 65 words.`,
      ].join("\n");

      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content?.[0]?.type === "text" ? res.content[0].text.trim() : "";
      if (text.length > 20) return text;
    } catch {
      // fall through to stat-based fallback
    }
  }

  // Stat-based fallback — still unique per matchup, references both players by name
  const attrs = ["handles", "scoring", "quickness", "heart", "court_iq"] as const;
  const biggestEdge = attrs.reduce(
    (best, k) => {
      const diff = (winner[k] || 0) - (loser[k] || 0);
      return diff > best.diff ? { k, diff } : best;
    },
    { k: "scoring" as string, diff: 0 },
  );
  const loserStrength = attrs.reduce(
    (best, k) =>
      (loser[k] || 0) > (winner[k] || 0) && (loser[k] || 0) > best.val
        ? { k, val: loser[k] }
        : best,
    { k: "heart" as string, val: 0 },
  );

  return (
    `${winner.name} edges this one in iso — the ${ATTR_LABELS[biggestEdge.k]} advantage is real and it shows up when shots are contested. ` +
    `${loser.name} brings ${ATTR_LABELS[loserStrength.k] || "toughness"} to the table, but ${winner.name}'s bag goes deeper in a true 1v1 setting.`
  );
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
  const GENERIC_MARKER = "iso pedigree to finish over contests"; // old generic fallback marker

  const needsAnalysis =
    !matchupSnap.exists ||
    !matchupSnap.data()?.analysis ||
    matchupSnap.data()?.analysis?.includes(GENERIC_MARKER);

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
