"use client";
import { Era } from "@/lib/types";

const eras: (Era | "All-Time")[] = ["All-Time", "90s", "2000s", "Current"];

export function EraFilter({
  value,
  onChange,
}: {
  value: Era | "All-Time";
  onChange: (v: Era | "All-Time") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {eras.map((e) => (
        <button
          key={e}
          onClick={() => onChange(e)}
          className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition-all ${
            value === e
              ? "bg-checkup-orange text-black"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
