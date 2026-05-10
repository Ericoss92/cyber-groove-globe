import type { Artist, Country, Song } from "./types";

export const COUNTRIES: Country[] = [
  { name: "France",         code: "FR", flag: "🇫🇷", continent: "Europe",        lat: 46.6,  lng: 2.2 },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", continent: "Europe",        lat: 54.0,  lng: -2.0 },
  { name: "Germany",        code: "DE", flag: "🇩🇪", continent: "Europe",        lat: 51.1,  lng: 10.4 },
  { name: "Sweden",         code: "SE", flag: "🇸🇪", continent: "Europe",        lat: 60.1,  lng: 18.6 },
  { name: "United States",  code: "US", flag: "🇺🇸", continent: "North America", lat: 39.8,  lng: -98.5 },
  { name: "Canada",         code: "CA", flag: "🇨🇦", continent: "North America", lat: 56.1,  lng: -106.3 },
  { name: "Brazil",         code: "BR", flag: "🇧🇷", continent: "South America", lat: -14.2, lng: -51.9 },
  { name: "Argentina",      code: "AR", flag: "🇦🇷", continent: "South America", lat: -38.4, lng: -63.6 },
  { name: "Japan",          code: "JP", flag: "🇯🇵", continent: "Asia",          lat: 36.2,  lng: 138.2 },
  { name: "South Korea",    code: "KR", flag: "🇰🇷", continent: "Asia",          lat: 35.9,  lng: 127.7 },
  { name: "India",          code: "IN", flag: "🇮🇳", continent: "Asia",          lat: 20.6,  lng: 78.9 },
  { name: "Australia",      code: "AU", flag: "🇦🇺", continent: "Oceania",       lat: -25.3, lng: 133.8 },
  { name: "South Africa",   code: "ZA", flag: "🇿🇦", continent: "Africa",        lat: -30.6, lng: 22.9 },
  { name: "Nigeria",        code: "NG", flag: "🇳🇬", continent: "Africa",        lat: 9.1,   lng: 8.7 },
  { name: "Mexico",         code: "MX", flag: "🇲🇽", continent: "North America", lat: 23.6,  lng: -102.5 },
];

const SAMPLE = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 16) + 1}.mp3`;

const cover = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/600`;
const banner = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}-bn/1600/600`;

type Seed = {
  slug: string; name: string; country: string; genres: string[]; year: number;
  bio: string; tracks: string[];
};

const SEEDS: Seed[] = [
  { slug: "neon-mirage", name: "Neon Mirage", country: "France", genres: ["Synthwave", "Electronic"], year: 2014,
    bio: "Duo parisien explorant les paysages sonores rétro-futuristes, entre nappes analogiques et beats acérés.",
    tracks: ["Midnight Drive", "Chrome Skyline", "Pulse 808", "Holographic Heart", "Last Transmission"] },
  { slug: "cobalt-howl", name: "Cobalt Howl", country: "France", genres: ["Indie Rock", "Post-Punk"], year: 2018,
    bio: "Énergie brute et textures abrasives, Cobalt Howl secoue la scène lyonnaise depuis 2018.",
    tracks: ["Wireframe", "Static Bloom", "Iron Lung", "Glass Saints"] },
  { slug: "violet-cipher", name: "Violet Cipher", country: "United Kingdom", genres: ["Drum & Bass", "Electronic"], year: 2011,
    bio: "Producteur londonien célèbre pour ses lignes de basse hypnotiques et ses sets implacables.",
    tracks: ["Cipher 01", "Bassline Theology", "Subterrain", "Deadlock", "Voltage"] },
  { slug: "tide-machine", name: "Tide Machine", country: "United Kingdom", genres: ["Indie Rock", "Shoegaze"], year: 2016,
    bio: "Murs de guitares saturées et mélodies aériennes — un classique instantané du shoegaze 2.0.",
    tracks: ["Lighthouse", "Salt", "Faint Signal", "Drowned Sun"] },
  { slug: "kraftbahn", name: "Kraftbahn", country: "Germany", genres: ["Techno", "Industrial"], year: 2009,
    bio: "Machine berlinoise implacable. Techno minimal pensée pour les sous-sols sans fenêtre.",
    tracks: ["S-Bahn", "Beton", "Frequenz", "Nachtwerk", "Kreislauf"] },
  { slug: "alva-storm", name: "Alva Storm", country: "Sweden", genres: ["Pop", "Electropop"], year: 2019,
    bio: "Pop nordique cristalline, mélodies imparables et production ciselée par Alva elle-même.",
    tracks: ["North Star", "Silver Glow", "Polar", "Frostbite"] },
  { slug: "midnight-coast", name: "Midnight Coast", country: "United States", genres: ["Indie Pop", "Dream Pop"], year: 2015,
    bio: "Quatuor de Los Angeles porté par les voix éthérées de sa chanteuse Maya Lin.",
    tracks: ["Pacific", "Headlights", "Sundown", "Sleepwalker", "Echo Park"] },
  { slug: "sable-syntax", name: "Sable Syntax", country: "United States", genres: ["Hip-Hop", "Electronic"], year: 2017,
    bio: "Rap expérimental new-yorkais sur des productions glitchées et organiques.",
    tracks: ["Syntax Error", "Black Box", "Recursion", "Endpoint"] },
  { slug: "north-aurora", name: "North Aurora", country: "Canada", genres: ["Folk", "Indie"], year: 2013,
    bio: "Folk lumineux de Montréal, harmonies vocales et instrumentation organique.",
    tracks: ["Borealis", "Pine", "Lantern", "Old River"] },
  { slug: "tropico-azul", name: "Tropico Azul", country: "Brazil", genres: ["MPB", "Electronic"], year: 2016,
    bio: "Fusion brésilienne moderne — bossa, samba et électronique au coucher du soleil de Rio.",
    tracks: ["Praia", "Azul", "Carnaval Noir", "Saudade.exe"] },
  { slug: "lunes-pampa", name: "Lunes Pampa", country: "Argentina", genres: ["Latin Indie", "Folk"], year: 2014,
    bio: "Songwriting argentin doux-amer porté par une guitare flamenco et une voix de braise.",
    tracks: ["Pampa", "Gaucho", "Vino Tinto", "Fuego Lento"] },
  { slug: "akihabara-glitch", name: "Akihabara Glitch", country: "Japan", genres: ["Electronic", "J-Pop"], year: 2012,
    bio: "Chaos kawaii — synthés 8-bit, breakcore et samples vocaux hyper-saturés.",
    tracks: ["Pixel Rain", "Tokyo 3AM", "Vending Machine", "Bento Bass", "Neon Saké"] },
  { slug: "kohaku-quiet", name: "Kohaku Quiet", country: "Japan", genres: ["Ambient", "Modern Classical"], year: 2008,
    bio: "Compositions intimistes pour piano et field recordings, signées depuis Kyoto.",
    tracks: ["Kawa", "Tsuki", "Yuki", "Kage"] },
  { slug: "hangang-bloom", name: "Hangang Bloom", country: "South Korea", genres: ["K-Pop", "R&B"], year: 2020,
    bio: "Trio R&B/K-pop de Séoul, harmonies sirupeuses et productions futuristes.",
    tracks: ["Bloom", "Hangang", "Velvet", "Skyline"] },
  { slug: "monsoon-cell", name: "Monsoon Cell", country: "India", genres: ["Electronic", "Fusion"], year: 2018,
    bio: "Tablas, sitars et synthés modulaires — Mumbai rencontre Berlin.",
    tracks: ["Monsoon", "Bombay Bass", "Raga 2049", "Steel Lotus"] },
  { slug: "outback-current", name: "Outback Current", country: "Australia", genres: ["Indie Rock", "Surf"], year: 2017,
    bio: "Surf-rock australien teinté de psyché — guitares chaudes et reverb sans fin.",
    tracks: ["Bondi", "Reef", "Sundrenched", "Coastline"] },
  { slug: "kalahari-pulse", name: "Kalahari Pulse", country: "South Africa", genres: ["Afro House", "Electronic"], year: 2015,
    bio: "Afro house solaire né à Johannesburg, voix gospel et grooves hypnotiques.",
    tracks: ["Pulse", "Sunset Drum", "Savana", "Indigo Sky"] },
  { slug: "lagos-gold", name: "Lagos Gold", country: "Nigeria", genres: ["Afrobeats", "R&B"], year: 2019,
    bio: "Afrobeats moderne porté par des mélodies imparables et une basse profonde.",
    tracks: ["Gold", "Lagos Nights", "Halla", "Sunrise"] },
  { slug: "sol-cuervo", name: "Sol Cuervo", country: "Mexico", genres: ["Cumbia", "Electronic"], year: 2016,
    bio: "Cumbia électronique de Mexico City — danse-floor et rituel.",
    tracks: ["Cuervo", "Sol", "Mezcalito", "Frontera"] },
];

let songCounter = 0;
function buildArtist(seed: Seed): Artist {
  const country = COUNTRIES.find(c => c.name === seed.country)!;
  const songs: Song[] = seed.tracks.map((t, i) => {
    songCounter += 1;
    return {
      id: `${seed.slug}-${i}`,
      title: t,
      duration: 180 + ((songCounter * 37) % 120),
      url: SAMPLE(songCounter),
      artistSlug: seed.slug,
      artistName: seed.name,
      genre: seed.genres[i % seed.genres.length],
      cover: cover(seed.slug + "-" + i),
    };
  });
  return {
    slug: seed.slug,
    name: seed.name,
    country: country.name,
    countryCode: country.code,
    continent: country.continent,
    genres: seed.genres,
    bio: seed.bio,
    foundedYear: seed.year,
    image: cover(seed.slug + "-portrait"),
    banner: banner(seed.slug),
    followers: 12_000 + ((seed.year * 9173) % 3_000_000),
    socials: {
      instagram: "https://instagram.com/" + seed.slug,
      twitter: "https://twitter.com/" + seed.slug,
      youtube: "https://youtube.com/@" + seed.slug,
      spotify: "https://open.spotify.com/artist/" + seed.slug,
    },
    songs,
  };
}

export const ARTISTS: Artist[] = SEEDS.map(buildArtist);

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
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
