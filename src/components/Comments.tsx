"use client";
import { useEffect, useState } from "react";

interface CommentRow {
  id: string;
  text: string;
  upvotes: number;
}

export function Comments({ matchupId }: { matchupId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    const r = await fetch(`/api/comments?matchupId=${matchupId}`);
    const d = await r.json();
    setComments(d.comments ?? []);
  }
  useEffect(() => { load(); }, [matchupId]);

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupId, text: text.slice(0, 200) }),
    });
    setText("");
    setPosting(false);
    load();
  }

  async function upvote(id: string) {
    await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
      <h3 className="mb-3 font-display text-2xl text-checkup-orange">TRASH TALK</h3>
      <div className="flex gap-2">
        <input
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="One-line take..."
          className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-checkup-orange"
        />
        <button
          onClick={post}
          disabled={posting || !text.trim()}
          className="rounded-lg bg-checkup-orange px-4 py-2 font-display text-black disabled:opacity-50"
        >
          POST
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {comments.slice(0, 3).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
          >
            <span className="text-sm">{c.text}</span>
            <button
              onClick={() => upvote(c.id)}
              className="ml-3 shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-checkup-orange hover:text-black"
            >
              🔥 {c.upvotes}
            </button>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-sm text-white/40">No takes yet. Be the first.</li>
        )}
      </ul>
    </section>
  );
}
