export type Category =
  | "NBA"
  | "WNBA"
  | "Streetball Icons"
  | "Fantasy"
  | "Celebrity Ballers";

export type Era = "90s" | "2000s" | "2010s" | "Current" | "All-Time";

export interface PlayerAttributes {
  handles: number;
  scoring: number;
  quickness: number;
  heart: number;
  court_iq: number;
}

export interface Player {
  id: string;
  name: string;
  category: Category;
  era: Era;
  photo_url: string;
  youtube_search_query: string;
  image_search_query?: string;
  youtube_video_id?: string;
  bio: string;
  handles: number;
  scoring: number;
  quickness: number;
  heart: number;
  court_iq: number;
}

export interface Matchup {
  id: string;
  player_a_id: string;
  player_b_id: string;
  analysis: string;
  stats_edge: string;
  created_at: number;
}

export interface Vote {
  id?: string;
  matchup_id: string;
  player_voted_id: string;
  created_at: number;
}

export interface Comment {
  id?: string;
  matchup_id: string;
  text: string;
  upvotes: number;
  created_at: number;
}

export const ATTRS: (keyof PlayerAttributes)[] = [
  "handles",
  "scoring",
  "quickness",
  "heart",
  "court_iq",
];
