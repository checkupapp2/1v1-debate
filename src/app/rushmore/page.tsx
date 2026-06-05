"use client";
import { useEffect, useState } from "react";
import { getTopVoted } from "@/lib/local";
import { Player } from "@/lib/types";

export default function RushmorePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [top, setTop] = useState<Player[]>([]);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players || []);
        const counts = getTopVoted();
        const list = counts
          .slice(0, 4)
          .map((c) => (d.players as Player[]).find((p) => p.id === c.id))
          .filter(Boolean) as Player[];
        setTop(list);
      });
  }, []);

  function shareRushmore() {
    const names = top.map((p) => p.name).join(", ");
    const text = `My 1v1 Mt. Rushmore: ${names}. Build yours at checkupbasketball.com — Check-Up 1v1.`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-center font-display text-5xl">
        YOUR 1V1 <span className="text-checkup-orange">MT. RUSHMORE</span>
      </h1>
      <p className="mt-2 text-center text-sm uppercase tracking-widest text-white/50">
        The 4 you back when it counts
      </p>

      {top.length === 0 && (
        <div className="mt-10 text-center text-white/60">
          Vote more matchups to unlock your Mt. Rushmore.
        </div>
      )}

      {top.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {top.map((p, i) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-checkup-orange/40 bg-[#1a1a1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={p.name} className="aspect-[3/4] w-full object-cover" />
              <div className="p-3">
                <div className="text-xs uppercase tracking-widest text-checkup-orange">#{i + 1}</div>
                <div className="font-display text-xl">{p.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {top.length === 4 && (
        <div className="mt-8 text-center">
          <button
            onClick={shareRushmore}
            className="rounded-xl bg-checkup-orange px-6 py-3 font-display text-xl text-black"
          >
            SHARE YOUR RUSHMORE
          </button>
        </div>
      )}
    </main>
  );
}
