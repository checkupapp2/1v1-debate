import { Player, ATTRS } from "./types";

export function matchupId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export function computeStatsEdge(a: Player, b: Player): { winnerId: string; aScore: number; bScore: number } {
  const aScore = ATTRS.reduce((s, k) => s + (a[k] as number), 0);
  const bScore = ATTRS.reduce((s, k) => s + (b[k] as number), 0);
  return { winnerId: aScore >= bScore ? a.id : b.id, aScore, bScore };
}
