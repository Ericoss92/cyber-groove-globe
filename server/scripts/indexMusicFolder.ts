/**
 * SOUNDWAVE — indexMusicFolder
 *
 * Scans /public/music recursively and regenerates src/data/music.ts.
 *
 * Expected directory layout:
 *   public/music/<continent>/<country>/<genre>/<artist>/<song>.mp3
 *
 * Usage (from /server):
 *   npm run index-music
 *
 * The generated music.ts exposes the same public API as the previous
 * hand-curated file (COUNTRIES, ARTISTS, artistsByCountry, artistBySlug,
 * allSongs, searchAll, countriesWithArtists, formatDuration) so the rest
 * of the frontend keeps working without changes.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root = /server/scripts → ../..
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MUSIC_DIR = path.join(REPO_ROOT, "public", "music");
const OUT_FILE = path.join(REPO_ROOT, "src", "data", "music.ts");

const AUDIO_EXT = new Set([".mp3", ".m4a", ".flac", ".ogg", ".wav", ".webm"]);

// ---------- Country metadata (extend as needed) ----------
type CountryMeta = { name: string; code: string; flag: string; continent: string; lat: number; lng: number };

const COUNTRY_DB: Record<string, CountryMeta> = {
  // Africa
  egypt:         { name: "Egypt",         code: "EG", flag: "🇪🇬", continent: "Africa",        lat: 26.82, lng: 30.80 },
  nigeria:       { name: "Nigeria",       code: "NG", flag: "🇳🇬", continent: "Africa",        lat: 9.08,  lng: 8.68 },
  "south-africa":{ name: "South Africa",  code: "ZA", flag: "🇿🇦", continent: "Africa",        lat: -30.56,lng: 22.94 },
  morocco:       { name: "Morocco",       code: "MA", flag: "🇲🇦", continent: "Africa",        lat: 31.79, lng: -7.09 },
  algeria:       { name: "Algeria",       code: "DZ", flag: "🇩🇿", continent: "Africa",        lat: 28.03, lng: 1.66 },
  senegal:       { name: "Senegal",       code: "SN", flag: "🇸🇳", continent: "Africa",        lat: 14.50, lng: -14.45 },
  ethiopia:      { name: "Ethiopia",      code: "ET", flag: "🇪🇹", continent: "Africa",        lat: 9.15,  lng: 40.49 },
  kenya:         { name: "Kenya",         code: "KE", flag: "🇰🇪", continent: "Africa",        lat: -0.02, lng: 37.91 },

  // Europe
  france:        { name: "France",        code: "FR", flag: "🇫🇷", continent: "Europe",        lat: 46.23, lng: 2.21 },
  "united-kingdom":{name:"United Kingdom",code: "GB", flag: "🇬🇧", continent: "Europe",        lat: 54.0,  lng: -2.0 },
  uk:            { name: "United Kingdom",code: "GB", flag: "🇬🇧", continent: "Europe",        lat: 54.0,  lng: -2.0 },
  germany:       { name: "Germany",       code: "DE", flag: "🇩🇪", continent: "Europe",        lat: 51.16, lng: 10.45 },
  spain:         { name: "Spain",         code: "ES", flag: "🇪🇸", continent: "Europe",        lat: 40.46, lng: -3.74 },
  italy:         { name: "Italy",         code: "IT", flag: "🇮🇹", continent: "Europe",        lat: 41.87, lng: 12.56 },
  sweden:        { name: "Sweden",        code: "SE", flag: "🇸🇪", continent: "Europe",        lat: 60.13, lng: 18.64 },
  norway:        { name: "Norway",        code: "NO", flag: "🇳🇴", continent: "Europe",        lat: 60.47, lng: 8.47 },
  netherlands:   { name: "Netherlands",   code: "NL", flag: "🇳🇱", continent: "Europe",        lat: 52.13, lng: 5.29 },
  belgium:       { name: "Belgium",       code: "BE", flag: "🇧🇪", continent: "Europe",        lat: 50.50, lng: 4.47 },
  portugal:      { name: "Portugal",      code: "PT", flag: "🇵🇹", continent: "Europe",        lat: 39.40, lng: -8.22 },
  ireland:       { name: "Ireland",       code: "IE", flag: "🇮🇪", continent: "Europe",        lat: 53.41, lng: -8.24 },
  poland:        { name: "Poland",        code: "PL", flag: "🇵🇱", continent: "Europe",        lat: 51.92, lng: 19.14 },
  russia:        { name: "Russia",        code: "RU", flag: "🇷🇺", continent: "Europe",        lat: 61.52, lng: 105.32 },

  // Americas
  "united-states":{name:"United States",  code: "US", flag: "🇺🇸", continent: "North America", lat: 39.83, lng: -98.58 },
  usa:           { name: "United States", code: "US", flag: "🇺🇸", continent: "North America", lat: 39.83, lng: -98.58 },
  canada:        { name: "Canada",        code: "CA", flag: "🇨🇦", continent: "North America", lat: 56.13, lng: -106.35 },
  mexico:        { name: "Mexico",        code: "MX", flag: "🇲🇽", continent: "North America", lat: 23.63, lng: -102.55 },
  brazil:        { name: "Brazil",        code: "BR", flag: "🇧🇷", continent: "South America", lat: -14.24,lng: -51.93 },
  argentina:     { name: "Argentina",     code: "AR", flag: "🇦🇷", continent: "South America", lat: -38.42,lng: -63.62 },
  chile:         { name: "Chile",         code: "CL", flag: "🇨🇱", continent: "South America", lat: -35.68,lng: -71.54 },
  colombia:      { name: "Colombia",      code: "CO", flag: "🇨🇴", continent: "South America", lat: 4.57,  lng: -74.30 },
  cuba:          { name: "Cuba",          code: "CU", flag: "🇨🇺", continent: "North America", lat: 21.52, lng: -77.78 },

  // Asia
  japan:         { name: "Japan",         code: "JP", flag: "🇯🇵", continent: "Asia",          lat: 36.20, lng: 138.25 },
  "south-korea": { name: "South Korea",   code: "KR", flag: "🇰🇷", continent: "Asia",          lat: 35.91, lng: 127.77 },
  korea:         { name: "South Korea",   code: "KR", flag: "🇰🇷", continent: "Asia",          lat: 35.91, lng: 127.77 },
  china:         { name: "China",         code: "CN", flag: "🇨🇳", continent: "Asia",          lat: 35.86, lng: 104.20 },
  india:         { name: "India",         code: "IN", flag: "🇮🇳", continent: "Asia",          lat: 20.59, lng: 78.96 },
  thailand:      { name: "Thailand",      code: "TH", flag: "🇹🇭", continent: "Asia",          lat: 15.87, lng: 100.99 },
  indonesia:     { name: "Indonesia",     code: "ID", flag: "🇮🇩", continent: "Asia",          lat: -0.79, lng: 113.92 },
  vietnam:       { name: "Vietnam",       code: "VN", flag: "🇻🇳", continent: "Asia",          lat: 14.06, lng: 108.28 },
  philippines:   { name: "Philippines",   code: "PH", flag: "🇵🇭", continent: "Asia",          lat: 12.88, lng: 121.77 },
  turkey:        { name: "Turkey",        code: "TR", flag: "🇹🇷", continent: "Asia",          lat: 38.96, lng: 35.24 },
  israel:        { name: "Israel",        code: "IL", flag: "🇮🇱", continent: "Asia",          lat: 31.05, lng: 34.85 },

  // Oceania
  australia:     { name: "Australia",     code: "AU", flag: "🇦🇺", continent: "Oceania",       lat: -25.27,lng: 133.78 },
  "new-zealand": { name: "New Zealand",   code: "NZ", flag: "🇳🇿", continent: "Oceania",       lat: -40.90,lng: 174.89 },
};

// ---------- Helpers ----------
const slugify = (s: string) =>
  s.toLowerCase()
   .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-")
   .replace(/^-+|-+$/g, "");

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();

function continentTitle(folder: string): string {
  const map: Record<string, string> = {
    africa: "Africa", europe: "Europe", asia: "Asia", oceania: "Oceania",
    "north-america": "North America", "south-america": "South America",
    "americas": "Americas", "antarctica": "Antarctica",
  };
  return map[folder.toLowerCase()] ?? titleCase(folder);
}

function resolveCountry(continentFolder: string, countryFolder: string): CountryMeta {
  const k = slugify(countryFolder);
  if (COUNTRY_DB[k]) return COUNTRY_DB[k];
  // Fallback — unknown country, no flag, lat/lng 0
  return {
    name: titleCase(countryFolder),
    code: countryFolder.slice(0, 2).toUpperCase(),
    flag: "🏳️",
    continent: continentTitle(continentFolder),
    lat: 0,
    lng: 0,
  };
}

async function safeReadDir(p: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(p, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).filter(n => !n.startsWith("."));
  } catch { return []; }
}

async function listAudioFiles(p: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(p, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && AUDIO_EXT.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name);
  } catch { return []; }
}

// ---------- Data model ----------
type Song = {
  id: string; title: string; duration: number;
  url: string; audioUrl: string;
  artistSlug: string; artistName: string; genre: string; cover: string;
};
type Artist = {
  slug: string; name: string; country: string; countryCode: string; continent: string;
  genres: string[]; bio: string; foundedYear: number;
  image: string; banner: string; followers: number;
  socials: { instagram?: string; twitter?: string; youtube?: string; spotify?: string };
  songs: Song[];
};

// ---------- Scan ----------
async function scan(): Promise<{ countries: CountryMeta[]; artists: Artist[] }> {
  const artistsBySlug = new Map<string, Artist>();
  const usedCountries = new Map<string, CountryMeta>();

  const continents = await safeReadDir(MUSIC_DIR);
  if (continents.length === 0) {
    console.warn(`[indexer] No subfolders found in ${MUSIC_DIR}`);
  }

  for (const continent of continents) {
    const continentPath = path.join(MUSIC_DIR, continent);
    const countries = await safeReadDir(continentPath);
    for (const country of countries) {
      const countryMeta = resolveCountry(continent, country);
      const countryPath = path.join(continentPath, country);
      const genres = await safeReadDir(countryPath);
      for (const genre of genres) {
        const genrePath = path.join(countryPath, genre);
        const artists = await safeReadDir(genrePath);
        for (const artist of artists) {
          const artistPath = path.join(genrePath, artist);
          const files = await listAudioFiles(artistPath);
          if (files.length === 0) continue;

          const artistSlug = slugify(artist);
          const artistName = titleCase(artist);
          const genreTitle = titleCase(genre);

          let entry = artistsBySlug.get(artistSlug);
          if (!entry) {
            entry = {
              slug: artistSlug,
              name: artistName,
              country: countryMeta.name,
              countryCode: countryMeta.code,
              continent: countryMeta.continent,
              genres: [],
              bio: `${artistName} — ${countryMeta.name}.`,
              foundedYear: 2000,
              image: `https://picsum.photos/seed/${artistSlug}/600/600`,
              banner: `https://picsum.photos/seed/${artistSlug}-bn/1600/600`,
              followers: 0,
              socials: {},
              songs: [],
            };
            artistsBySlug.set(artistSlug, entry);
          }
          if (!entry.genres.includes(genreTitle)) entry.genres.push(genreTitle);
          usedCountries.set(countryMeta.name, countryMeta);

          for (const file of files) {
            const titleRaw = file.replace(/\.[^.]+$/, "");
            const songId = `${artistSlug}_${slugify(titleRaw)}`;
            const rel = `/music/${continent}/${country}/${genre}/${artist}/${file}`
              .split("/").map(seg => seg === "" ? "" : encodeURI(seg)).join("/");
            entry.songs.push({
              id: songId,
              title: titleCase(titleRaw),
              duration: 0, // unknown without probing; player reads metadata at runtime
              url: rel,
              audioUrl: rel,
              artistSlug,
              artistName,
              genre: genreTitle,
              cover: `https://picsum.photos/seed/${songId}/600/600`,
            });
          }
        }
      }
    }
  }

  // Stable sort
  const artists = [...artistsBySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  artists.forEach(a => a.songs.sort((x, y) => x.title.localeCompare(y.title)));
  const countries = [...usedCountries.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { countries, artists };
}

// ---------- Emit ----------
function emit(countries: CountryMeta[], artists: Artist[]): string {
  return `// AUTO-GENERATED by server/scripts/indexMusicFolder.ts — DO NOT EDIT BY HAND.
// Regenerate with:  cd server && npm run index-music
import type { Artist, Country, Song } from "@/lib/types";

export const COUNTRIES: Country[] = ${JSON.stringify(countries, null, 2)};

export const ARTISTS: Artist[] = ${JSON.stringify(artists, null, 2)};

export function artistsByCountry(country: string): Artist[] {
  return ARTISTS.filter(a => a.country.toLowerCase() === country.toLowerCase());
}
export function artistBySlug(slug: string): Artist | undefined {
  return ARTISTS.find(a => a.slug === slug);
}
export function allSongs(): Song[] {
  return ARTISTS.flatMap(a => a.songs);
}
export function searchAll(q: string): { artists: Artist[]; songs: Song[] } {
  const s = q.trim().toLowerCase();
  if (!s) return { artists: [], songs: [] };
  return {
    artists: ARTISTS.filter(a =>
      a.name.toLowerCase().includes(s) ||
      a.genres.join(" ").toLowerCase().includes(s) ||
      a.country.toLowerCase().includes(s)
    ).slice(0, 8),
    songs: allSongs().filter(t =>
      t.title.toLowerCase().includes(s) ||
      t.artistName.toLowerCase().includes(s)
    ).slice(0, 20),
  };
}
export function countriesWithArtists(): (Country & { count: number })[] {
  return COUNTRIES.map(c => ({ ...c, count: artistsByCountry(c.name).length }))
    .filter(c => c.count > 0);
}
export function formatDuration(sec: number): string {
  if (!sec || !isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return \`\${m}:\${s.toString().padStart(2, "0")}\`;
}
`;
}

// ---------- Main ----------
(async () => {
  console.log(`[indexer] Scanning ${MUSIC_DIR}`);
  const { countries, artists } = await scan();
  const totalSongs = artists.reduce((n, a) => n + a.songs.length, 0);
  const out = emit(countries, artists);
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, out, "utf8");
  console.log(`[indexer] ✔ wrote ${OUT_FILE}`);
  console.log(`[indexer]   ${countries.length} countries · ${artists.length} artists · ${totalSongs} songs`);
})().catch(err => {
  console.error("[indexer] FAILED", err);
  process.exit(1);
});
