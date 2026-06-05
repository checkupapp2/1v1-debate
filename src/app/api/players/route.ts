import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await adminDb.collection("players").get();
    if (snap.empty) {
      // Firestore empty — return seed list so app still works pre-seed.
      return NextResponse.json({ players: SEED_PLAYERS, source: "seed" });
    }
    const players = snap.docs.map((d) => d.data());
    return NextResponse.json({ players, source: "firestore" });
  } catch (e) {
    return NextResponse.json({ players: SEED_PLAYERS, source: "seed-fallback" });
  }
}
