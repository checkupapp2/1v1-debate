// Regenerates seed-players.json from players-data.mjs.
// Fetches Wikipedia images for any player with a wiki_slug.
// Preserves existing verified photo_urls.
// Run: node scripts/build-players.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { NBA, WNBA, STREETBALL, CELEBRITY, FANTASY } from "./players-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(__dirname, "./seed-players.json");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

// Known verified photos (manual overrides — never auto-replaced)
const MANUAL_PHOTOS = {
  "skip":       "https://i.ytimg.com/vi/8wQtErmIyLg/maxresdefault.jpg",
  "hotsauce":   "https://i.ytimg.com/vi/Yk0y011eSBI/maxresdefault.jpg",
  "peewee":     "https://i.ytimg.com/vi/-iJLjUjzNng/maxresdefault.jpg",
  "bone":       "https://i.ytimg.com/vi/g7TBlXZRhHk/maxresdefault.jpg",
  "ao":         "https://fadeawayworld.net/wp-content/uploads/2023/05/received_1402846847161243-1536x864.jpg",
  "druski":     "https://ntvb.tmsimg.com/assets/assets/1686525_v9_aa.jpg",
  "25-lbj":     "https://www.nydailynews.com/wp-content/uploads/migration/2010/12/16/XQPDBHAEF2VAYKP23WGIC6BVUA.jpg?w=535",
  "25-mj":      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEicdfaE3qPohrCx9jL0pYAgovQuXr3B4Rv92ukFVUfiJvsGNeglP6eRUdUMXa_hFUK2TXbIXY7fq9k8N1H1UX8L7h1F1uxiYIT1Gtrg1hdxXFZFOcBFfujgB_Pid1Gh1_O8Z8Q-T63OSHK4pVZd-sZo07drqGgSK-8I1ve70MdvTqukI6223ySdT3hIzK8/w1200-h630-p-k-no-nu/gettyimages-1465028-1024x1024.jpg",
  "prime-ai":   "https://upload.wikimedia.org/wikipedia/commons/2/21/Allen_Iverson_headshot.jpg",
  "young-kobe": "https://upload.wikimedia.org/wikipedia/commons/3/36/Kobe_Bryant_Dec_2014.jpg",
  // ─── WNBA ────────────────────────────────────────────────────────────────
  "diana-taurasi":       "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Diana_Taurasi_2024_%28cropped%29.jpg/960px-Diana_Taurasi_2024_%28cropped%29.jpg",
  "tamika-catchings":    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Tamika_Catchings.jpg/960px-Tamika_Catchings.jpg",
  "lauren-jackson":      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Lauren_Jackson_2.jpg/960px-Lauren_Jackson_2.jpg",
  "yolanda-griffith":    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Griffith_Yolanda_Headshot.jpg/960px-Griffith_Yolanda_Headshot.jpg",
  "katie-smith":         "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Katie_Smith_at_a_Minnesota_Lynx_press_conference_%28cropped%29.jpg/960px-Katie_Smith_at_a_Minnesota_Lynx_press_conference_%28cropped%29.jpg",
  "tina-thompson":       "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Tina_Thompson_cropped.jpg/960px-Tina_Thompson_cropped.jpg",
  "swin-cash":           "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Swin_Cash_%28cropped%29.jpg/960px-Swin_Cash_%28cropped%29.jpg",
  "chamique-holdsclaw":  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Chamique_Holdsclaw.jpg/960px-Chamique_Holdsclaw.jpg",
  "candace-parker":      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Candace_Parker_%28cropped%29.jpg/960px-Candace_Parker_%28cropped%29.jpg",
  "brittney-griner":     "https://upload.wikimedia.org/wikipedia/commons/0/02/Brittney_Griner.jpg",
  "elena-delle-donne":   "https://upload.wikimedia.org/wikipedia/commons/b/b1/Elena_Delle_Donne.jpg",
  "breanna-stewart":     "https://upload.wikimedia.org/wikipedia/commons/2/2f/Breanna_Stewart_2015.jpg",
  "caitlin-clark":       "https://upload.wikimedia.org/wikipedia/commons/8/86/Caitlin_Clark_%28cropped%29.jpg",
  "aliyah-boston":       "https://upload.wikimedia.org/wikipedia/commons/b/b4/Aliyah_Boston.jpg",
  "kelsey-plum":         "https://upload.wikimedia.org/wikipedia/commons/3/3c/Kelsey_Plum_%2848092716093%29.jpg",
  "aja-wilson":          "https://upload.wikimedia.org/wikipedia/commons/3/33/A%27ja_Wilson.jpg",
  "lindsay-whalen":      "https://upload.wikimedia.org/wikipedia/commons/0/0c/Whalen_Commons.jpg",
  "nneka-ogwumike":      "https://upload.wikimedia.org/wikipedia/commons/9/9d/Nneka_Ogwumike_2024_%28cropped%29.jpg",
  "angel-mccoughtry":    "https://upload.wikimedia.org/wikipedia/commons/a/aa/Angel_McCoughtry_in_2018.jpg",
  "jewell-loyd":         "https://upload.wikimedia.org/wikipedia/commons/a/a2/Jewell_Loyd_%28cropped%29.jpg",
  "seimone-augustus":    "https://upload.wikimedia.org/wikipedia/commons/3/35/Seimone_Augustus_cropped.jpg",
  "sylvia-fowles":       "https://upload.wikimedia.org/wikipedia/commons/c/c0/2_Sylvia_Fowles_2019_%28cropped%29.jpg",
  "angel-reese":         "https://upload.wikimedia.org/wikipedia/commons/5/5e/Angel_Reese_%28cropped%29.jpg",
  "chelsea-gray":        "https://upload.wikimedia.org/wikipedia/commons/1/1e/Chelsea_Gray_%28cropped%29.jpg",
  "arike-ogunbowale":    "https://upload.wikimedia.org/wikipedia/commons/f/f7/Arike_Ogunbowale_02.jpg",
};

function avatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=600&background=F9A825&color=1E1E1E&bold=true&font-size=0.35`;
}

async function wikiImage(slug) {
  if (!slug) return null;
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(slug)}&pithumbsize=800&format=json&origin=*`;
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const d = await r.json();
    const pages = d.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return page.thumbnail?.source || null;
  } catch { return null; }
}

async function buildPlayer(row) {
  const [id, name, category, era, wiki_slug, bio, handles, scoring, quickness, heart, court_iq] = row;

  // Determine photo_url
  let photo_url = MANUAL_PHOTOS[id] || null;

  if (!photo_url && existing[id]?.photo_url && !existing[id].photo_url.includes("ui-avatars")) {
    photo_url = existing[id].photo_url;
  }

  if (!photo_url && wiki_slug) {
    process.stdout.write(`  fetching ${id} (${wiki_slug})… `);
    photo_url = await wikiImage(wiki_slug);
    console.log(photo_url ? `✓ ${new URL(photo_url).hostname}` : "✗ no image");
    await new Promise(r => setTimeout(r, 250));
  }

  photo_url = photo_url || avatar(name);

  return {
    id, name, category, era,
    photo_url,
    wiki_slug: wiki_slug || undefined,
    youtube_search_query: `${name} best 1v1 highlights basketball`,
    image_search_query: `${name} basketball portrait`,
    bio,
    handles, scoring, quickness, heart, court_iq,
  };
}

// Load existing seed to preserve already-verified photo_urls
const existing = {};
if (existsSync(SEED_PATH)) {
  JSON.parse(readFileSync(SEED_PATH, "utf8")).forEach(p => (existing[p.id] = p));
}

const allRows = [...NBA, ...WNBA, ...STREETBALL, ...CELEBRITY, ...FANTASY];
console.log(`Building ${allRows.length} players…`);

const players = [];
for (const row of allRows) {
  players.push(await buildPlayer(row));
}

// Dedup by id (last write wins — handles sga2 / repeated entries)
const deduped = Object.values(Object.fromEntries(players.map(p => [p.id, p])));

writeFileSync(SEED_PATH, JSON.stringify(deduped, null, 2));
console.log(`\nWrote ${deduped.length} players to seed-players.json`);
