"use client";
import { useEffect, useState } from "react";

const COLORS = ["#F9A825", "#FFFFFF", "#FF6B35", "#00BCD4", "#FF4081", "#76FF03"];
const SHAPES = ["square", "circle"];

interface ConfettiProps {
  trigger: boolean;
}

export default function Confetti({ trigger }: ConfettiProps) {
  type Piece = { id: number; x: number; color: string; shape: string; delay: number; size: number };
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      delay: Math.random() * 0.6,
      size: 6 + Math.random() * 8,
    }));
    setPieces(newPieces);
    const timer = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: "1.8s",
          }}
          className="confetti-piece"
        />
      ))}
    </div>
  );
}