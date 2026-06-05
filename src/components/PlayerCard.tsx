"use client";
import { Player } from "@/lib/types";

export function PlayerCard({
  player,
  onVote,
  disabled,
  highlighted,
  faded,
  side,
}: {
  player: Player;
  onVote?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  faded?: boolean;
  side: "left" | "right";
}) {
  return (
    <button
      onClick={onVote}
      disabled={disabled}
      className={`group relative flex h-full w-full flex-col overflow-hidden border transition-all duration-300 ${
        highlighted
          ? "border-checkup-orange shadow-[0_0_60px_-10px_#F9A825] scale-[1.01]"
          : "border-white/10"
      } ${faded ? "opacity-30 scale-95" : ""} ${
        side === "left" ? "rounded-l-2xl sm:rounded-2xl" : "rounded-r-2xl sm:rounded-2xl"
      } bg-[#262626] disabled:cursor-default`}
    >
      <div className="relative h-full w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.photo_url}
          alt={player.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const t = e.currentTarget;
            const name = encodeURIComponent(player.name);
            t.src = `https://ui-avatars.com/api/?name=${name}&size=600&length=2&background=F9A825&color=1E1E1E&bold=true&font-size=0.4`;
          }}
        />
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
        {/* Side accent */}
        {highlighted && (
          <div className="absolute inset-0 ring-4 ring-checkup-orange ring-inset" />
        )}
        {/* Info */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 text-left sm:px-4 sm:pb-4">
          <div className="mb-1 flex flex-wrap gap-1">
            <span className="rounded-full bg-checkup-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black sm:text-[10px]">
              {player.category}
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white sm:text-[10px]">
              {player.era}
            </span>
          </div>
          <div className="font-display text-2xl leading-none sm:text-4xl md:text-5xl">
            {player.name}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] text-white/70 sm:mt-2 sm:text-sm">
            {player.bio}
          </p>
          {onVote && !disabled && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-checkup-orange px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black sm:mt-3 sm:px-4 sm:py-2 sm:text-xs">
              <span>Tap to pick</span>
              <span>→</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
