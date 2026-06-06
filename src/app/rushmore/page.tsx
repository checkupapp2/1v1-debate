"use client";
import { useEffect, useRef, useState } from "react";
import { getTopVoted } from "@/lib/local";
import { Player } from "@/lib/types";

export default function RushmorePage() {
  const [top, setTop] = useState<Player[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => {
        const allPlayers: Player[] = d.players || [];
        const counts = getTopVoted();
        const list = counts
          .slice(0, 4)
          .map((c) => allPlayers.find((p) => p.id === c.id))
          .filter(Boolean) as Player[];
        setTop(list);
      })
      .catch(() => {});
  }, []);

  async function shareRushmore() {
    if (sharing) return;
    setSharing(true);
    setShareMsg("Creating image…");

    try {
      if (captureRef.current) {
        // Dynamic import so html2canvas doesn't bloat the initial bundle
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(captureRef.current, {
          backgroundColor: "#0A0A0A",
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        canvas.toBlob(async (blob) => {
          if (!blob) { fallbackShare(); return; }
          const file = new File([blob], "my-rushmore.png", { type: "image/png" });

          // Native share sheet (iOS / Android)
          if (
            typeof navigator !== "undefined" &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
          ) {
            await navigator.share({
              files: [file],
              title: "My 1v1 Mt. Rushmore",
              text: `My basketball 1v1 Mt. Rushmore: ${top.map((p) => p.name).join(", ")}. Build yours on Check-Up 1v1!`,
            });
            setShareMsg("");
          } else {
            // Desktop fallback — download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "my-rushmore.png";
            a.click();
            URL.revokeObjectURL(url);
            setShareMsg("Image saved!");
            setTimeout(() => setShareMsg(""), 2500);
          }
          setSharing(false);
        }, "image/png");
        return; // blob callback handles setSharing(false)
      }
    } catch {
      // html2canvas failed — fall through to text share
    }

    fallbackShare();
    setSharing(false);
  }

  function fallbackShare() {
    const names = top.map((p) => p.name).join(", ");
    const text = `My 1v1 Mt. Rushmore: ${names}. Build yours at checkupbasketball.com — Check-Up 1v1.`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text, url }).catch(() => {});
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        "_blank",
      );
    }
    setShareMsg("");
  }

  const hasAll4 = top.length === 4;

  return (
    <main
      className="flex flex-col"
      style={{ height: "100dvh", background: "#0A0A0A", overflow: "hidden" }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between px-4 py-2.5"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "linear-gradient(180deg,#1A1A1A 0%,#0F0F0F 100%)",
        }}
      >
        <a href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/checkup_btn.png"
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            style={{ boxShadow: "0 0 8px rgba(255,152,0,0.4)" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/checkup_main.png"
            alt="Check-Up"
            className="h-6 w-auto object-contain"
            style={{ maxWidth: 120 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </a>
        <a
          href="/"
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          ← Back
        </a>
      </header>

      {/* ── CAPTURE AREA (no share button inside) ───────────────────── */}
      <div
        ref={captureRef}
        className="flex flex-col flex-1 min-h-0"
        style={{ background: "#0A0A0A", padding: "12px 12px 8px" }}
      >
        {/* Title */}
        <div className="shrink-0 text-center mb-3">
          <h1
            className="font-display text-2xl sm:text-3xl tracking-wider"
            style={{ lineHeight: 1.1 }}
          >
            YOUR{" "}
            <span
              style={{
                background: "linear-gradient(135deg,#FF9800,#FF5722)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MT. RUSHMORE
            </span>
          </h1>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mt-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            The 4 you back when it counts
          </p>
        </div>

        {/* ── Empty / partial state ─────────────────────────────────── */}
        {!hasAll4 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <div className="text-5xl">🏀</div>
            <p
              className="font-display text-2xl text-center"
              style={{ color: "#FF9800" }}
            >
              {top.length === 0
                ? "No Votes Yet"
                : `${4 - top.length} More to Go`}
            </p>
            <p
              className="text-sm font-medium text-center"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {top.length === 0
                ? "Vote some 1v1 matchups to build your Rushmore"
                : `You need ${4 - top.length} more vote${4 - top.length > 1 ? "s" : ""} to fill out your Rushmore`}
            </p>
            <a
              href="/"
              className="mt-2 inline-block rounded-2xl px-6 py-3 font-bold text-sm uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg,#FF9800,#FF5722)",
                color: "#000",
                boxShadow: "0 4px 14px rgba(255,152,0,0.4)",
              }}
            >
              Go Vote →
            </a>
          </div>
        )}

        {/* ── 2×2 grid ──────────────────────────────────────────────── */}
        {hasAll4 && (
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            {top.map((p, i) => (
              <div
                key={p.id}
                className="relative flex flex-col overflow-hidden rounded-2xl min-h-0"
                style={{
                  border: "1px solid rgba(255,152,0,0.35)",
                  background: "#111",
                }}
              >
                {/* Photo */}
                <div className="relative flex-1 min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://placehold.co/400x500/111111/FF9800?text=🏀";
                    }}
                  />
                  {/* bottom fade */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: "45%",
                      background:
                        "linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 100%)",
                    }}
                  />
                  {/* Rank badge */}
                  <div
                    className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
                    style={{
                      background: "linear-gradient(135deg,#FF9800,#FF5722)",
                      color: "#000",
                    }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Name strip */}
                <div
                  className="shrink-0 px-2.5 py-2"
                  style={{ background: "#0D0D0D" }}
                >
                  <p
                    className="font-display text-sm leading-tight truncate"
                    style={{ color: "#fff" }}
                  >
                    {p.name}
                  </p>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider truncate"
                    style={{ color: "#FF9800" }}
                  >
                    {p.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Watermark — visible in captured image */}
        {hasAll4 && (
          <div className="shrink-0 flex items-center justify-center gap-1.5 pt-2 pb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/checkup_btn.png"
              alt=""
              className="h-4 w-4 rounded-full object-cover opacity-50"
            />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Check-Up 1v1
            </span>
          </div>
        )}
      </div>

      {/* ── SHARE BUTTON — outside capture so it's not in the image ─── */}
      {hasAll4 && (
        <div
          className="shrink-0 px-4 pt-2 pb-4"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={shareRushmore}
            disabled={sharing}
            className="w-full rounded-2xl py-4 font-display text-lg tracking-wider transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg,#FF9800,#FF5722)",
              color: "#000",
              boxShadow: "0 4px 18px rgba(255,152,0,0.5)",
            }}
          >
            {shareMsg || (sharing ? "Creating Image…" : "📸 Share Your Rushmore")}
          </button>
        </div>
      )}
    </main>
  );
}
