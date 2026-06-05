// Server-only helper. Fetches a single video ID for a search query.
// Uses YOUTUBE_API_KEY from the existing Check-Up Google Cloud project.
export async function fetchYouTubeVideoId(query: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key.toLowerCase().startsWith("paste_")) return null;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.items?.[0]?.id?.videoId ?? null;
  } catch {
    return null;
  }
}
