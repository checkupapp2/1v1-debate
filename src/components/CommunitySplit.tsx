"use client";
import { Player } from "@/lib/types";

export function CommunitySplit({
  a,
  b,
  aVotes,
  bVotes,
  userPickedId,
}: {
  a: Player;
  b: Player;
  aVotes: number;
  bVotes: number;
  userPickedId: string;
}) {
  const total = Math.max(1, aVotes + bVotes);
  const aPct = Math.round((aVotes / total) * 100);
  const bPct = 100 - aPct;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-display text-xl">
        <span className={userPickedId === a.id ? "text-checkup-orange" : ""}>
          {a.name} {aPct}%
        </span>
        <span className={userPickedId === b.id ? "text-checkup-orange" : ""}>
          {bPct}% {b.name}
        </span>
      </div>
      <div className="flex h-6 overflow-hidden rounded-full bg-white/10">
        <div
          className="animate-grow bg-checkup-orange"
          style={{ width: `${aPct}%` }}
        />
        <div className="animate-grow bg-white/40" style={{ width: `${bPct}%` }} />
      </div>
      <div className="mt-2 text-center text-xs uppercase tracking-widest text-white/50">
        {aVotes + bVotes} community votes
      </div>
    </div>
  );
}
