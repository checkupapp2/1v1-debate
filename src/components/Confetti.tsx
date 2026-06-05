"use client";
// CSS-only vote feedback — no canvas, no heavy animations, instant on mobile Safari
import { useEffect, useState } from "react";

interface Props {
  votedId: string | null;
}

export default function Confetti({ votedId }: Props) {
  const [rings, setRings] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (!votedId) return;
    // Spawn 3 expanding rings from center of voted card
    const rings = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 40 + (Math.random() - 0.5) * 20,
    }));
    setRings(rings);
    const t = setTimeout(() => setRings([]), 1000);
    return () => clearTimeout(t);
  }, [votedId]);

  if (rings.length === 0) return null;

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {rings.map((r) => (
        <div
          key={r.id}
          style={{
            position: "absolute",
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(249,168,37,0.6)",
            animation: "ring-burst 0.8s ease-out forwards",
          }}
        />
      ))}
      <style>{`
        @keyframes ring-burst {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(40); opacity: 0; border: 2px solid #F9A825; background: transparent; }
        }
      `}</style>
    </div>
  );
}
