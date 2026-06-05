"use client";
import { useEffect, useState } from "react";
import { Player } from "@/lib/types";
import { AttributeBars } from "./AttributeBars";
import { CommunitySplit } from "./CommunitySplit";
import { computeStatsEdge } from "@/lib/matchup";

interface RevealProps {
  a: Player;
  b: Player;
  userPickedId: string;
  matchupId: string;
  analysis: string;
  aVotes: number;
  bVotes: number;
  videoId?: string | null;
  onNext: () => void;
  voteCount: number;
}

export function Reveal({
  a,
  b,
  userPickedId,
  matchupId,
  analysis,
  aVotes,
  bVotes,
  videoId,
  onNext,
  voteCount,
}: RevealProps) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 2000);
    const t3 = setTimeout(() => setStep(3), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const total = aVotes + bVotes;
  const pickedPct =
    total === 0
      ? 50
      : Math.round(((userPickedId === a.id ? aVotes : bVotes) / total) * 100);
  const isUnderdog = total >= 10 && pickedPct < 30;
  const edge = computeStatsEdge(a, b);
  const userPickedName = userPickedId === a.id ? a.name : b.name;
  const disagrees = edge.winnerId !== userPickedId;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/matchup/${matchupId}`
      : `/matchup/${matchupId}`;

  return (
    <div className="space-y-8">
      {step >= 1 && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="mb-4 font-display text-2xl text-checkup-orange">
            01 — Community Vote
          </h3>
          <CommunitySplit
            a={a}
            b={b}
            aVotes={aVotes}
            bVotes={bVotes}
            userPickedId={userPickedId}
          />
          {isUnderdog && (
            <div className="mt-4 rounded-xl border border-checkup-orange/40 bg-checkup-orange/10 p-3 text-center">
              <span className="font-display text-checkup-orange">🔥 UNDERDOG TAKE</span>
              <p className="mt-1 text-sm">
                Only {pickedPct}% agree with you on {userPickedName}. Respect.
              </p>
              <button
                onClick={() => share(shareUrl, `Only ${pickedPct}% agree with me. I got ${userPickedName}. Underdog take. Check-Up 1v1.`)}
                className="mt-2 text-xs uppercase tracking-widest text-checkup-orange underline"
              >
                Share the underdog take
              </button>
            </div>
          )}
        </section>
      )}

      {step >= 2 && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="mb-4 font-display text-2xl text-checkup-orange">
            02 — Stats-Based Edge
          </h3>
          <AttributeBars a={a} b={b} />
          <div className="mt-4 text-center text-sm uppercase tracking-widest text-white/60">
            Numbers favor{" "}
            <span className="font-display text-base text-checkup-orange">
              {edge.winnerId === a.id ? a.name : b.name}
            </span>
          </div>
          {disagrees && (
            <div className="mt-4 text-center">
              <button
                onClick={() =>
                  share(
                    shareUrl,
                    `I still got ${userPickedName} — fight me. Stats disagree but the eye test don't lie. Check-Up 1v1.`,
                  )
                }
                className="rounded-xl border border-checkup-orange px-4 py-2 font-display text-checkup-orange hover:bg-checkup-orange hover:text-black"
              >
                I still got {userPickedName} — fight me
              </button>
            </div>
          )}
        </section>
      )}

      {step >= 3 && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <h3 className="mb-4 font-display text-2xl text-checkup-orange">
            03 — Check-Up Analysis
          </h3>
          <p className="text-lg leading-relaxed text-white/90">{analysis}</p>
          <div className="mt-3 text-xs uppercase tracking-widest text-white/40">
            — Powered by Check-Up
          </div>
        </section>
      )}

      {step >= 3 && videoId && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-3">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Highlights"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {step >= 3 && (
        <section className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() =>
              share(
                shareUrl,
                `I picked ${userPickedName} in this 1v1. Who you got? Check-Up 1v1.`,
              )
            }
            className="rounded-xl bg-white px-6 py-3 font-display text-xl text-black hover:brightness-90"
          >
            SHARE THIS MATCHUP
          </button>
          <button
            onClick={() => copyInvite(shareUrl)}
            className="rounded-xl border border-white/30 px-6 py-3 font-display text-xl text-white hover:bg-white/10"
          >
            SETTLE A BEEF
          </button>
          <button
            onClick={onNext}
            className="rounded-xl bg-checkup-orange px-6 py-3 font-display text-xl text-black hover:brightness-110"
          >
            NEXT MATCHUP →
          </button>
        </section>
      )}

      {voteCount >= 10 && step >= 3 && (
        <section className="rounded-2xl border border-checkup-orange/40 bg-checkup-orange/10 p-6 text-center">
          <h3 className="font-display text-2xl text-checkup-orange">
            🏔 BUILD YOUR MT. RUSHMORE
          </h3>
          <p className="mt-2 text-sm text-white/80">
            You&apos;ve voted {voteCount} times. Lock in your top 4 1v1 hoopers.
          </p>
          <a
            href="/rushmore"
            className="mt-4 inline-block rounded-xl bg-checkup-orange px-6 py-2 font-display text-lg text-black hover:brightness-110"
          >
            BUILD IT
          </a>
        </section>
      )}
    </div>
  );
}

function share(url: string, text: string) {
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    (navigator as any).share({ url, text }).catch(() => window.open(twitter));
  } else {
    window.open(twitter, "_blank");
  }
}

function copyInvite(url: string) {
  const text = `You and your friend disagree? Send them this — see who the data backs. ${url}`;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    alert("Invite link copied. Send it to the doubter.");
  }
}
