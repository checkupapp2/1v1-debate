"use client";
import { Player, ATTRS } from "@/lib/types";

export function AttributeBars({ a, b }: { a: Player; b: Player }) {
  return (
    <div className="space-y-3">
      {ATTRS.map((k) => {
        const av = a[k] as number;
        const bv = b[k] as number;
        const aWins = av >= bv;
        return (
          <div key={k}>
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
              <span className={aWins ? "text-checkup-orange" : ""}>{av}</span>
              <span>{k.replace("_", " ")}</span>
              <span className={!aWins ? "text-checkup-orange" : ""}>{bv}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className={`animate-grow ${aWins ? "bg-checkup-orange" : "bg-white/40"}`}
                style={{ width: `${(av / (av + bv)) * 100}%` }}
              />
              <div
                className={`animate-grow ${!aWins ? "bg-checkup-orange" : "bg-white/40"}`}
                style={{ width: `${(bv / (av + bv)) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
