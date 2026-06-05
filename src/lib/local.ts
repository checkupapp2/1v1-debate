"use client";
// Track vote history client-side for Mt. Rushmore feature.
const KEY = "checkup-1v1-votes";

export function recordLocalVote(playerId: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEY);
  const arr: string[] = raw ? JSON.parse(raw) : [];
  arr.push(playerId);
  localStorage.setItem(KEY, JSON.stringify(arr));
}

export function getLocalVotes(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getTopVoted(): { id: string; count: number }[] {
  const votes = getLocalVotes();
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}
