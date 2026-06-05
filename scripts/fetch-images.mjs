// Fetch real player photos via DuckDuckGo image search (cleaner JSON than Bing).
// Filters out spam/NSFW/stock-photo domains. Verifies each candidate before saving.
//
// Run: node scripts/fetch-images.mjs            (only fill in ui-avatars placeholders)
//      node scripts/fetch-images.mjs --force    (re-fetch all)
//      node scripts/fetch-images.mjs --only mj,25-lbj
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, "./seed-players.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(",").map(s => s.trim()) : null;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

// Hard block: porn, stock photo SEO traps, social CDNs that 403 hotlinks
const BAD_HOSTS = new Set([
  "eporner.com", "imggen.eporner.com", "xxx.com", "pornhub.com",
  "alamy.com", "l450v.alamy.com", "c8.alamy.com", "shutterstock.com",
  "istockphoto.com", "media.istockphoto.com", "dreamstime.com",
  "depositphotos.com", "123rf.com", "gettyimages.com",
  "mydramalist.com", "i.mydramalist.com",
  "lookaside.fbsbx.com", "scontent.cdninstagram.com", "pbs.twimg.com",
  "imimg.com", "3.imimg.com", "techxxl.com",
  "fbcd.co", "fbcdn.net",
  "ar.pinterest.com", // pinterest hotlinks 403 often
]);

// Strong preference — bump these to the top
const PREFERRED_HOSTS = [
  "upload.wikimedia.org",
  "cdn.britannica.com",
  "cdn.nba.com",
  "a.espncdn.com",
  "espncdn.com",
  "bleacherreport.net", "cdn.bleacherreport.net",
  "static.nba.com",
  "nbcsports.com",
  "wikimedia.org",
  "live.staticflickr.com", "c1.staticflickr.com", "c2.staticflickr.com",
  "media.gettyimages.com",
  "static01.nyt.com",
  "people.com",
  "billboard.com",
  "rollingstone.com",
  "complex.com",
  "and1.com",
  "hoopshype.com",
  "slamonline.com",
];

function scoreHost(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (BAD_HOSTS.has(h)) return -999;
    for (let i = 0; i < PREFERRED_HOSTS.length; i++) {
      if (h.endsWith(PREFERRED_HOSTS[i])) return PREFERRED_HOSTS.length - i + 10;
    }
    // Generic CDN check
    if (/\.(cdn|static|media)\./.test(h)) return 2;
    if (h.endsWith(".com") || h.endsWith(".org") || h.endsWith(".net")) return 1;
    return 0;
  } catch { return -999; }
}

function looksLikeImage(u) {
  return /\.(jpe?g|png|webp)(\?|#|$)/i.test(new URL(u).pathname);
}

async function getVqd(query) {
  const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`, {
    headers: { "User-Agent": UA },
  });
  const html = await res.text();
  const m = html.match(/vqd=["']?([^"'&\s]+)/);
  if (!m) throw new Error("vqd not found");
  return m[1];
}

async function ddgImageSearch(query) {
  const vqd = await getVqd(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,size:Medium,type:photo&p=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "application/json",
      "Referer": "https://duckduckgo.com/",
    },
  });
  if (!res.ok) throw new Error(`DDG returned ${res.status}`);
  const data = await res.json();
  const results = (data.results || [])
    .map(r => ({ url: r.image, width: r.width, height: r.height, title: r.title || "" }))
    .filter(r => r.url && looksLikeImage(r.url))
    .filter(r => (r.width || 0) >= 400 && (r.height || 0) >= 400);
  return results;
}

async function verify(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, "Range": "bytes=0-2048", "Accept": "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 206) return false;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return false;
    return true;
  } catch { return false; }
}

async function pick(query) {
  let results;
  try {
    results = await ddgImageSearch(query);
  } catch (e) {
    return { url: null, reason: e.message };
  }
  // Sort by host preference, then by size
  results.sort((a, b) => {
    const sa = scoreHost(a.url), sb = scoreHost(b.url);
    if (sa !== sb) return sb - sa;
    return (b.width * b.height) - (a.width * a.height);
  });
  for (const r of results.slice(0, 20)) {
    if (scoreHost(r.url) < 0) continue;
    if (await verify(r.url)) {
      return { url: r.url, score: scoreHost(r.url), title: r.title };
    }
  }
  return { url: null, reason: "no verified candidate" };
}

function isPlaceholder(url) {
  return /ui-avatars\.com/.test(url || "");
}

async function run() {
  const players = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  let updated = 0, skipped = 0, failed = 0;

  for (const p of players) {
    if (only && !only.includes(p.id)) { skipped++; continue; }
    if (!force && !isPlaceholder(p.photo_url)) {
      console.log(`✓ keep   ${p.id.padEnd(22)} (already has real image)`);
      skipped++; continue;
    }
    const q = p.image_search_query || `${p.name} portrait`;
    process.stdout.write(`… ${p.id.padEnd(22)} "${q.slice(0, 50)}"  `);
    try {
      const { url, score, reason } = await pick(q);
      if (url) {
        p.photo_url = url;
        updated++;
        const host = new URL(url).hostname;
        console.log(`→ [${score}] ${host}`);
      } else {
        failed++;
        console.log(`✗ ${reason}`);
      }
    } catch (e) {
      failed++;
      console.log(`ERR ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 700));
  }

  writeFileSync(SEED_PATH, JSON.stringify(players, null, 2));
  console.log(`\nDone. updated=${updated} kept=${skipped} failed=${failed}`);
}

run().catch(e => { console.error(e); process.exit(1); });
