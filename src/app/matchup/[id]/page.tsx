import { adminDb } from "@/lib/firebaseAdmin";
import { SEED_PLAYERS } from "@/data/players";
import { Metadata } from "next";

interface Props { params: { id: string } }

async function getMatchup(id: string) {
  try {
    const doc = await adminDb.collection("matchups").doc(id).get();
    if (doc.exists) return doc.data() as any;
  } catch {}
  return null;
}

function findPlayer(id: string) {
  return SEED_PLAYERS.find((p) => p.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [aId, bId] = params.id.split("__");
  const a = findPlayer(aId);
  const b = findPlayer(bId);
  if (!a || !b) return { title: "Check-Up 1v1" };
  const ogUrl = `/api/og?a=${encodeURIComponent(a.name)}&b=${encodeURIComponent(b.name)}&aImg=${encodeURIComponent(a.photo_url)}&bImg=${encodeURIComponent(b.photo_url)}`;
  return {
    title: `${a.name} vs ${b.name} — Check-Up 1v1`,
    description: `Who wins 1v1? Vote now.`,
    openGraph: {
      title: `${a.name} vs ${b.name}`,
      description: "Settle the debate. Check-Up 1v1.",
      images: [ogUrl],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function MatchupPage({ params }: Props) {
  const [aId, bId] = params.id.split("__");
  const a = findPlayer(aId);
  const b = findPlayer(bId);
  const matchup = await getMatchup(params.id);

  if (!a || !b) {
    return <main className="p-8 text-center">Matchup not found.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-center font-display text-5xl">
        <span className="text-white">{a.name}</span>
        <span className="px-3 text-checkup-orange">VS</span>
        <span className="text-white">{b.name}</span>
      </h1>
      <p className="mt-2 text-center text-sm uppercase tracking-widest text-white/50">
        Who wins this 1v1?
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.photo_url} alt={a.name} className="aspect-[3/4] w-full object-cover" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.photo_url} alt={b.name} className="aspect-[3/4] w-full object-cover" />
        </div>
      </div>
      {matchup?.analysis && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="mb-3 font-display text-2xl text-checkup-orange">Check-Up Analysis</h3>
          <p className="text-lg text-white/90">{matchup.analysis}</p>
        </section>
      )}
      <div className="mt-8 text-center">
        <a
          href="/"
          className="inline-block rounded-xl bg-checkup-orange px-6 py-3 font-display text-xl text-black"
        >
          CAST YOUR VOTE →
        </a>
      </div>
    </main>
  );
}
