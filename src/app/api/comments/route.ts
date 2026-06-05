import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const matchupId = req.nextUrl.searchParams.get("matchupId");
  if (!matchupId) return NextResponse.json({ comments: [] });
  const snap = await adminDb
    .collection("comments")
    .where("matchup_id", "==", matchupId)
    .orderBy("upvotes", "desc")
    .limit(20)
    .get()
    .catch(async () => {
      // index missing — fall back unsorted
      return adminDb
        .collection("comments")
        .where("matchup_id", "==", matchupId)
        .limit(20)
        .get();
    });
  const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  comments.sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const { matchupId, text } = await req.json();
  if (!matchupId || !text?.trim()) return NextResponse.json({ error: "bad" }, { status: 400 });
  const clean = String(text).slice(0, 200);
  const ref = await adminDb.collection("comments").add({
    matchup_id: matchupId,
    text: clean,
    upvotes: 0,
    created_at: Date.now(),
  });
  return NextResponse.json({ id: ref.id });
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });
  await adminDb.collection("comments").doc(id).update({ upvotes: FieldValue.increment(1) });
  return NextResponse.json({ ok: true });
}
