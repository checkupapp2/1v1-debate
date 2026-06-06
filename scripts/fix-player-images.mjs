/**
 * fix-player-images.mjs
 *
 * Fixes two categories of broken player photos in seed-players.json:
 *   1. NBA players with Pinterest/hotlink-blocked/product-page URLs  → Wikipedia API
 *   2. AND1/celebrity players showing the WRONG person              → DuckDuckGo search
 *
 * Run: node scripts/fix-player-images.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dirname, "seed-players.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

// ─────────────────────────────────────────────────
// NBA PLAYERS: id → exact Wikipedia article title
// (had Pinterest / SI.com / Amazon / salaryleaks URLs)
// ─────────────────────────────────────────────────
const WIKI_FIXES = {
  mj:    "Michael Jordan",
  ai:    "Allen Iverson",
  kobe:  "Kobe Bryant",
  tmac:  "Tracy McGrady",
  isiah: "Isiah Thomas",
  wade:  "Dwyane Wade",
  pp:    "Paul Pierce",
  kyrie: "Kyrie Irving",
  lbj:   "LeBron James",
};

// ─────────────────────────────────────────────────
// NON-WIKI PLAYERS: id → better DuckDuckGo query
// (had completely wrong person, group shots, shoe photos)
// ─────────────────────────────────────────────────
const DDG_FIXES = {
  escalade: "Escalade AND1 Mixtape Tour streetball basketball player dunk",
  hmha:     "Justin Irvin Half Man Half Amazing AND1 streetball basketball player",
  main:     "Main Event AND1 Mixtape Tour streetball basketball player",
  quavo:    "Quavo Migos rapper basketball court player portrait",
  future:   "Future rapper Pluto basketball court player celebrity game",
};

// ─────────────────────────────────────────────────
// Wikipedia batch fetch (pageimages API)
// ─────────────────────────────────────────────────
async function wikiThumb(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=pageimages&format=json&pithumbsize=800`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const d = await r.json();
    for (const page of Object.values(d.query?.pages ?? {})) {
      if (page.thumbnail?.source) return page.thumbnail.source;
    }
  } catch {}
  return null;
}

// ─────────────────────────────────────────────────
// DuckDuckGo image search (same approach as fetch-images.mjs)
// ─────────────────────────────────────────────────
const BAD_HOSTS = new Set([
  "eporner.com","alamy.com","shutterstock.com","istockphoto.com","dreamstime.com",
  "depositphotos.com","123rf.com","gettyimages.com","lookaside.fbsbx.com",
  "scontent.cdninstagram.com","pbs.twimg.com","fbcdn.net","ar.pinterest.com",
  "i.pinimg.com","pinimg.com",  // Pinterest blocks hotlinks
]);
const PREFERRED_HOSTS = [
  "upload.wikimedia.org","cdn.britannica.com","cdn.nba.com","a.espncdn.com",
  "espncdn.com","static.nba.com","wikimedia.org","live.staticflickr.com",
  "media.gettyimages.com","static01.nyt.com","and1.com","hoopshype.com",
  "slamonline.com","fadeawayworld.net","i.ytimg.com",
];

function scoreHost(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (BAD_HOSTS.has(h)) return -999;
    for (let i = 0; i < PREFERRED_HOSTS.length; i++) {
      if (h.endsWith(PREFERRED_HOSTS[i])) return PREFERRED_HOSTS.length - i + 10;
    }
    if (/\.(cdn|static|media)\./.test(h)) return 2;
    return 1;
  } catch { return -999; }
}

function looksLikeImage(u) {
  try { return /\.(jpe?g|png|webp)(\?|#|$)/i.test(new URL(u).pathname); }
  catch { return false; }
}

async function getVqd(query) {
  const r = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`,
    { headers: { "User-Agent": UA } }
  );
  const html = await r.text();
  const m = html.match(/vqd=["']?([^"'&\s]+)/);
  return m?.[1] ?? null;
}

async function searchDDG(query) {
  try {
    const vqd = await getVqd(query);
    if (!vqd) return null;
    const params = new URLSearchParams({
      l: "us-en", o: "json", q: query, vqd, f: ",,,,,", p: "1",
    });
    const r = await fetch(`https://duckduckgo.com/i.js?${params}`, {
      headers: { "User-Agent": UA, "Referer": "https://duckduckgo.com/" },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const results = (d.results ?? [])
      .filter(x => x.image && looksLikeImage(x.image))
      .sort((a, b) => scoreHost(b.image) - scoreHost(a.image));
    return results[0]?.image ?? null;
  } catch { return null; }
}

async function verifyUrl(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    return r.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────
async function run() {
  const data = JSON.parse(readFileSync(SEED, "utf8"));
  const byId = Object.fromEntries(data.map((p) => [p.id, p]));
  let updated = 0;

  // ── Phase 1: Wikipedia fixes for NBA players ──────────────────────────────
  console.log("\n── Phase 1: Wikipedia images for NBA players ───────────────");
  const wikiEntries = Object.entries(WIKI_FIXES);
  for (let i = 0; i < wikiEntries.length; i += 10) {
    const batch = wikiEntries.slice(i, i + 10);
    // batch query
    const titleMap = Object.fromEntries(batch.map(([, t]) => [t, t]));
    const titles = Object.keys(titleMap).join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&format=json&pithumbsize=800`;
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      const d = await r.json();
      for (const page of Object.values(d.query?.pages ?? {})) {
        const img = page.thumbnail?.source;
        if (!img) continue;
        // find which player this matches
        for (const [id, wikiTitle] of batch) {
          if (page.title === wikiTitle || page.title.replace(/_/g, " ") === wikiTitle) {
            const p = byId[id];
            if (p) {
              console.log(`  ✓ ${p.name.padEnd(25)} → ${img.slice(0, 70)}…`);
              p.photo_url = img;
              updated++;
            }
          }
        }
      }
    } catch (e) {
      console.error("  Wikipedia batch error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  // ── Phase 2: DuckDuckGo fixes for players with wrong images ───────────────
  console.log("\n── Phase 2: DuckDuckGo for AND1/celebrity wrong-person fixes ──");
  for (const [id, query] of Object.entries(DDG_FIXES)) {
    const p = byId[id];
    if (!p) { console.log(`  — ${id}: not found in JSON`); continue; }
    console.log(`  Searching "${query}"…`);
    const img = await searchDDG(query);
    if (!img) { console.log(`  ✗ ${p.name}: no result`); continue; }
    const ok = await verifyUrl(img);
    if (!ok) { console.log(`  ✗ ${p.name}: URL did not verify → ${img.slice(0, 60)}`); continue; }
    console.log(`  ✓ ${p.name.padEnd(28)} → ${img.slice(0, 70)}…`);
    p.photo_url = img;
    updated++;
    await new Promise((r) => setTimeout(r, 800)); // be nice to DDG
  }

  writeFileSync(SEED, JSON.stringify(data.map(p => byId[p.id]), null, 2));
  console.log(`\n✅ Done — updated ${updated} players.\n`);
}

run().catch((e) => { console.error(e); process.exit(1); });
