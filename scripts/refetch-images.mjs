// Re-fetches Wikipedia images using the action API (supports batch queries).
// Only updates players that still have ui-avatars placeholder.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(__dirname, "./seed-players.json");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

// player_id → Wikipedia page title (underscores, exact page name)
const TITLES = {
  cousy:"Bob_Cousy", pippen:"Scottie_Pippen", barkley:"Charles_Barkley",
  ewing:"Patrick_Ewing", hakeem:"Hakeem_Olajuwon", admiral:"David_Robinson_(basketball)",
  gp:"Gary_Payton", reggie:"Reggie_Miller", stockton:"John_Stockton", malone:"Karl_Malone",
  drexler:"Clyde_Drexler", nique:"Dominique_Wilkins", shaq:"Shaquille_O'Neal",
  penny:"Anfernee_Hardaway", kemp:"Shawn_Kemp", granthill:"Grant_Hill_(basketball)",
  timhardaway:"Tim_Hardaway", zo:"Alonzo_Mourning", kg:"Kevin_Garnett", timmy:"Tim_Duncan",
  nash:"Steve_Nash", rayallen:"Ray_Allen", melo:"Carmelo_Anthony", dirk:"Dirk_Nowitzki",
  kidd:"Jason_Kidd", amare:"Amar'e_Stoudemire", arenas:"Gilbert_Arenas", bd:"Baron_Davis",
  tp:"Tony_Parker", manu:"Manu_Ginobili", yao:"Yao_Ming", bosh:"Chris_Bosh",
  bwallace:"Ben_Wallace_(basketball)", lamar:"Lamar_Odom",
  russ:"Russell_Westbrook", harden:"James_Harden", ad:"Anthony_Davis_(basketball)",
  drose:"Derrick_Rose", blake:"Blake_Griffin", klay:"Klay_Thompson",
  pg13:"Paul_George", jwall:"John_Wall", kawhi:"Kawhi_Leonard", dray:"Draymond_Green",
  kat:"Karl-Anthony_Towns", derozan:"DeMar_DeRozan", kemba:"Kemba_Walker",
  beal:"Bradley_Beal", it4:"Isaiah_Thomas_(basketball)",
  giannis:"Giannis_Antetokounmpo", jokic:"Nikola_Jokić", embiid:"Joel_Embiid",
  luka:"Luka_Dončić", trae:"Trae_Young", zion:"Zion_Williamson",
  ja:"Ja_Morant", dbook:"Devin_Booker", ant:"Anthony_Edwards_(basketball)",
  sga:"Shai_Gilgeous-Alexander", dmitch:"Donovan_Mitchell_(basketball)",
  jbrown:"Jaylen_Brown", bam:"Bam_Adebayo", wemby:"Victor_Wembanyama",
  paolo:"Paolo_Banchero", dame:"Damian_Lillard", sga2:"Shai_Gilgeous-Alexander",
  tyhal:"Tyrese_Haliburton", dafox:"De'Aaron_Fox", brunson:"Jalen_Brunson",
  "2chainz":"2_Chainz", jackharlow:"Jack_Harlow", meekmill:"Meek_Mill",
  masterp:"Master_P", obama:"Barack_Obama", mgk:"Machine_Gun_Kelly_(musician)",
  wizkhalifa:"Wiz_Khalifa", offset:"Offset_(rapper)", bowwow:"Bow_Wow",
  badbunny:"Bad_Bunny", theGame:"The_Game_(rapper)", odell:"Odell_Beckham_Jr.",
  "young-shaq":"Shaquille_O'Neal",
  professor:"Grayson_Boucher",
  escalade:"Devin_Harris",  // Devin "Escalade" Edwards — using different player as close substitute
  "prime-kd":"Kevin_Durant",
};

async function batchFetch(titleToId) {
  const titles = Object.keys(titleToId).join("|");
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&format=json&pithumbsize=800`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return {};
  const d = await r.json();
  const result = {};
  for (const page of Object.values(d.query?.pages || {})) {
    const img = page.thumbnail?.source;
    if (!img) continue;
    // Match back to player id via normalized title
    const normalized = page.title;
    for (const [t, id] of Object.entries(titleToId)) {
      if (t.replace(/_/g, " ") === normalized || t === normalized) {
        result[id] = img;
      }
    }
  }
  return result;
}

const data = JSON.parse(readFileSync(SEED, "utf8"));
const byId = Object.fromEntries(data.map(p => [p.id, p]));

// Only work on players that still need images
const needed = Object.entries(TITLES).filter(([id]) =>
  byId[id] && byId[id].photo_url?.includes("ui-avatars")
);

console.log(`Fetching images for ${needed.length} players…`);

// Batch by 50
const BATCH = 50;
let updated = 0;
for (let i = 0; i < needed.length; i += BATCH) {
  const chunk = needed.slice(i, i + BATCH);
  const titleToId = Object.fromEntries(chunk.map(([id, title]) => [title, id]));
  const results = await batchFetch(titleToId);
  for (const [id, imgUrl] of Object.entries(results)) {
    if (byId[id]) { byId[id].photo_url = imgUrl; updated++; }
  }
  console.log(`  Batch ${Math.floor(i/BATCH)+1}: got ${Object.keys(results).length}/${chunk.length}`);
  await new Promise(r => setTimeout(r, 600));
}

writeFileSync(SEED, JSON.stringify(Object.values(byId), null, 2));
console.log(`\nDone. Updated ${updated} players.`);

// Print remaining avatars
const still = Object.values(byId).filter(p => p.photo_url?.includes("ui-avatars"));
if (still.length) {
  console.log(`Still missing (${still.length}): ${still.map(p=>p.id).join(", ")}`);
}
