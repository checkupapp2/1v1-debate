import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { computeStatsEdge } from "@/lib/matchup";
import { fetchYouTubeVideoId } from "@/lib/youtube";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { matchupId, playerVotedId, playerAId, playerBId } = await req.json();
  if (!matchupId || !playerVotedId) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  // Look up players (firestore first, fall back to seed)
  async function findPlayer(id: string) {
    try {
      const doc = await adminDb.collection("players").doc(id).get();
      if (doc.exists) return doc.data() as any;
    } catch {}
    return SEED_PLAYERS.find((p) => p.id === id);
  }
  const a = await findPlayer(playerAId);
  const b = await findPlayer(playerBId);
  if (!a || !b) return NextResponse.json({ error: "no players" }, { status: 404 });

  // Ensure matchup doc exists
  const matchupRef = adminDb.collection("matchups").doc(matchupId);
  let matchupSnap = await matchupRef.get();
  if (!matchupSnap.exists) {
    const edge = computeStatsEdge(a, b);
    const fallback = `${(edge.winnerId === a.id ? a.name : b.name)} takes this 1v1 with a slight edge — sharper shotmaking and the iso pedigree to finish over contests. Live with the loser's pull-up, but the closer is the closer.`;
    await matchupRef.set({
      id: matchupId,
      player_a_id: a.id,
      player_b_id: b.id,
      analysis: fallback,
      stats_edge: edge.winnerId,
      created_at: Date.now(),
    });
    matchupSnap = await matchupRef.get();
  }

  // Cache YouTube video for the voted player
  let videoId: string | null = null;
  try {
    const playerRef = adminDb.collection("players").doc(playerVotedId);
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
    await adminDb.collection("votes").add({
      matchup_id: matchupId,
      player_voted_id: playerVotedId,
      created_at: Date.now(),
    });
  } catch {}

  // Tally
  const votesSnap = await adminDb
    .collection("votes")
    .where("matchup_id", "==", matchupId)
    .get();
  let aVotes = 0,
    bVotes = 0;
  votesSnap.forEach((d) => {
    const v = d.data();
    if (v.player_voted_id === a.id) aVotes++;
    else if (v.player_voted_id === b.id) bVotes++;
  });

  const data = matchupSnap.data()!;
  return NextResponse.json({
    matchup_id: matchupId,
    analysis: data.analysis,
    aVotes,
    bVotes,
    videoId,
  });
}
