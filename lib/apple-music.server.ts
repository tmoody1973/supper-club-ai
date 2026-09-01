import "server-only";

import type { SourceRef, Track } from "@/lib/types";

type AppleMusicArtwork = {
  width?: number;
  height?: number;
  url?: string;
  bgColor?: string;
};

type AppleMusicSong = {
  id?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    url?: string;
    previews?: Array<{ url?: string }>;
    artwork?: AppleMusicArtwork;
  };
};

type AppleMusicSearch = {
  results?: { songs?: { data?: AppleMusicSong[] } };
};

export type AppleMusicMatch = {
  providerId: string;
  title: string;
  artist: string;
  albumName?: string;
  sourceUrl: string;
  previewUrl?: string;
  artwork?: Track["artwork"];
  source: SourceRef;
};

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

const artworkFromApple = (artwork?: AppleMusicArtwork): Track["artwork"] => {
  if (!artwork?.url || !artwork.width || !artwork.height) return undefined;
  const size = Math.min(320, artwork.width, artwork.height);
  return {
    url: artwork.url.replaceAll("{w}", String(size)).replaceAll("{h}", String(size)),
    width: size,
    height: size,
    backgroundColor: artwork.bgColor ? `#${artwork.bgColor.replace(/^#/, "")}` : undefined,
  };
};

const toMatch = (song: AppleMusicSong): AppleMusicMatch | null => {
  const attributes = song.attributes;
  if (!song.id || !attributes?.name || !attributes.artistName) return null;
  const sourceUrl = attributes.url ?? "https://music.apple.com/";
  return {
    providerId: song.id,
    title: attributes.name,
    artist: attributes.artistName,
    albumName: attributes.albumName,
    sourceUrl,
    previewUrl: attributes.previews?.find((preview) => Boolean(preview.url))?.url,
    artwork: artworkFromApple(attributes.artwork),
    source: {
      sourceId: `src-apple-music-${song.id}`,
      provider: "Apple Music",
      title: `${attributes.artistName} — ${attributes.name}`,
      url: sourceUrl,
      accessedAt: new Date().toISOString(),
      attribution: "Catalog metadata supplied by Apple Music.",
    },
  };
};

export async function searchAppleMusicCatalog(
  query: string,
  storefront: string,
  limit: number,
  signal: AbortSignal,
): Promise<AppleMusicMatch[]> {
  const token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  if (!token) throw new Error("APPLE_MUSIC_NOT_CONFIGURED");
  const url = new URL(`https://api.music.apple.com/v1/catalog/${encodeURIComponent(storefront)}/search`);
  url.searchParams.set("term", query);
  url.searchParams.set("types", "songs");
  url.searchParams.set("limit", String(Math.min(10, Math.max(1, limit))));
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!response.ok) throw new Error(`APPLE_MUSIC_${response.status}`);
  const payload = await response.json() as AppleMusicSearch;
  return (payload.results?.songs?.data ?? []).flatMap((song) => {
    const match = toMatch(song);
    return match ? [match] : [];
  });
}

export const appleMusicMatchScore = (
  match: Pick<AppleMusicMatch, "title" | "artist">,
  wanted: { title: string; artist: string },
) => {
  const title = normalize(match.title);
  const artist = normalize(match.artist);
  const wantedTitle = normalize(wanted.title);
  const wantedArtist = normalize(wanted.artist);
  let score = 0;
  if (title === wantedTitle) score += 20;
  else if (title.startsWith(wantedTitle) || wantedTitle.startsWith(title)) score += 8;
  if (artist === wantedArtist) score += 20;
  else if (artist.includes(wantedArtist) || wantedArtist.includes(artist)) score += 8;
  if (/remix|karaoke|tribute|cover/.test(title) && !/remix|cover/.test(wantedTitle)) score -= 10;
  return score;
};

export async function findAppleMusicMatch(
  wanted: { title: string; artist: string },
  storefront: string,
  signal: AbortSignal,
): Promise<AppleMusicMatch | null> {
  const candidates = await searchAppleMusicCatalog(`${wanted.artist} ${wanted.title}`, storefront, 10, signal);
  const ranked = candidates
    .map((match) => ({ match, score: appleMusicMatchScore(match, wanted) }))
    .sort((left, right) => right.score - left.score);
  // Require evidence from both the title and artist. An artist-only hit can
  // otherwise attach an unrelated song (for example when a seed names an album).
  return ranked[0] && ranked[0].score >= 28 ? ranked[0].match : null;
}
