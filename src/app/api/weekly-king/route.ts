import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const snap = await adminDb
      .collection("votes")
      .where("created_at", ">=", weekAgo)
      .get();
    const counts: Record<string, number> = {};
    snap.forEach((d) => {
      const id = d.data().player_voted_id as string;
      counts[id] = (counts[id] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return NextResponse.json({ king: null });
    const [topId, votes] = entries[0];
    let name = topId;
    try {
      const doc = await adminDb.collection("players").doc(topId).get();
      if (doc.exists) name = doc.data()?.name ?? topId;
      else name = SEED_PLAYERS.find((p) => p.id === topId)?.name ?? topId;
    } catch {
      name = SEED_PLAYERS.find((p) => p.id === topId)?.name ?? topId;
    }
    return NextResponse.json({ king: { id: topId, name, votes } });
  } catch (e) {
    return NextResponse.json({ king: null });
  }
}
