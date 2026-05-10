export type Song = {
  id: string;
  title: string;
  duration: number; // seconds
  url: string;
  artistSlug: string;
  artistName: string;
  genre: string;
  cover: string;
};

export type Artist = {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  continent: string;
  genres: string[];
  bio: string;
  foundedYear: number;
  image: string;
  banner: string;
  followers: number;
  socials: { instagram?: string; twitter?: string; youtube?: string; spotify?: string };
  songs: Song[];
};

export type Country = {
  name: string;
  code: string;
  flag: string;
  continent: string;
  lat: number;
  lng: number;
};
