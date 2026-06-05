"use client";
import { useEffect, useState } from "react";

export function WeeklyKingBanner() {
  const [king, setKing] = useState<{ name: string; votes: number } | null>(null);
  useEffect(() => {
    fetch("/api/weekly-king")
      .then((r) => r.json())
      .then((d) => setKing(d?.king ?? null))
      .catch(() => {});
  }, []);
  if (!king) return null;
  return (
    <div className="border-y border-checkup-orange/40 bg-checkup-orange/10 py-2 text-center text-sm">
      <span className="font-display text-base text-checkup-orange">
        👑 1V1 KING OF THE WEEK:
      </span>{" "}
      <span className="font-semibold">{king.name}</span>{" "}
      <span className="text-white/60">({king.votes} votes)</span>
    </div>
  );
}
