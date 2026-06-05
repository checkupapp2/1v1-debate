// Seed Firestore with starter players.
// Run: node scripts/seed-players.mjs
import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Inline import of the TS player list by parsing the compiled JS would be heavy;
// instead, mirror the seed data here in JSON-compatible form by reading a JSON file.
const seed = JSON.parse(
  readFileSync(resolve(__dirname, "./seed-players.json"), "utf8"),
);

async function run() {
  console.log(`Seeding ${seed.length} players to Firestore...`);
  const batch = db.batch();
  for (const player of seed) {
    const ref = db.collection("players").doc(player.id);
    batch.set(ref, player, { merge: true });
  }
  await batch.commit();
  console.log("Done.");
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
