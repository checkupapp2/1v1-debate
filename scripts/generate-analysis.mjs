// Pre-generate Claude analysis for every unique matchup. Idempotent.
// Run: node scripts/generate-analysis.mjs
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ATTRS = ["handles", "scoring", "quickness", "heart", "court_iq"];
function statsEdge(a, b) {
  const aS = ATTRS.reduce((s, k) => s + (a[k] || 0), 0);
  const bS = ATTRS.reduce((s, k) => s + (b[k] || 0), 0);
  return aS >= bS ? a.id : b.id;
}
function matchupId(a, b) {
  return [a, b].sort().join("__");
}

async function generate(a, b) {
  const winner = statsEdge(a, b);
  const winnerName = winner === a.id ? a.name : b.name;
  const prompt = `Generate a 2-sentence 1v1 basketball analysis comparing ${a.name} vs ${b.name}. Focus on isolation/1v1 situations only. Use real basketball language. Be direct. Give a slight edge to ${winnerName}. Keep it under 50 words.`;
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content?.[0]?.type === "text" ? res.content[0].text : "";
  return { text: text.trim(), winnerId: winner };
}

async function run() {
  const snap = await db.collection("players").get();
  if (snap.empty) {
    console.error("No players in Firestore. Run `npm run seed` first.");
    process.exit(1);
  }
  const players = snap.docs.map((d) => d.data());
  console.log(`${players.length} players → ${(players.length * (players.length - 1)) / 2} matchups`);

  let generated = 0, skipped = 0, failed = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const id = matchupId(a.id, b.id);
      const ref = db.collection("matchups").doc(id);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.analysis) { skipped++; continue; }
      try {
        const { text, winnerId } = await generate(a, b);
        await ref.set({
          id,
          player_a_id: a.id,
          player_b_id: b.id,
          analysis: text,
          stats_edge: winnerId,
          created_at: Date.now(),
        }, { merge: true });
        generated++;
        if (generated % 20 === 0) console.log(`  generated ${generated}, skipped ${skipped}`);
      } catch (e) {
        failed++;
        console.error(`  failed ${id}:`, e.message);
      }
    }
  }
  const estCost = (generated * 0.003).toFixed(2);
  console.log(`\nDone. Generated ${generated}, skipped ${skipped}, failed ${failed}. Est cost: $${estCost}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
