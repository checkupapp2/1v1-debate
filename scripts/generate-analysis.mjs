// Pre-generate OpenRouter analysis for every unique matchup. Idempotent.
// Run: node scripts/generate-analysis.mjs
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-4-5";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://1v1.checkupbasketball.com";

if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "PASTE_YOUR_OPENROUTER_KEY") {
  console.error("OPENROUTER_API_KEY not set in .env.local");
  process.exit(1);
}

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
  const winnerId = statsEdge(a, b);
  const winner = winnerId === a.id ? a : b;
  const loser  = winnerId === a.id ? b : a;

  const winnerEdges = ATTRS
    .filter(k => (winner[k] || 0) > (loser[k] || 0))
    .map(k => k.replace("_", " "));

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

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": SITE_URL,
      "X-Title": "Check-Up 1v1",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return { text, winnerId };
}

async function run() {
  const snap = await db.collection("players").get();
  if (snap.empty) {
    console.error("No players in Firestore. Run `npm run seed` first.");
    process.exit(1);
  }
  const players = snap.docs.map(d => d.data());
  const total = (players.length * (players.length - 1)) / 2;
  console.log(`${players.length} players → ${total} matchups  (model: ${MODEL})`);

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
        if (generated % 20 === 0) console.log(`  generated ${generated} / skipped ${skipped} / failed ${failed}`);
        // ~3 req/sec to stay well under rate limits
        await new Promise(r => setTimeout(r, 350));
      } catch (e) {
        failed++;
        console.error(`  failed ${id}:`, e.message);
      }
    }
  }
  console.log(`\nDone. Generated ${generated}, skipped ${skipped}, failed ${failed}.`);
}

run().catch(e => { console.error(e); process.exit(1); });
