import { useMemo } from "react";
import { COUNTRIES, artistsByCountry } from "@/data/music";

export type GlobePoint = {
  name: string;
  code: string;
  lat: number;
  lng: number;
  count: number;
};

/** Liste des pays avec au moins un artiste — alimente les points du globe. */
export function useGlobeData(): GlobePoint[] {
  return useMemo(
    () =>
      COUNTRIES.map((c) => ({
        name: c.name,
        code: c.code,
        lat: c.lat,
        lng: c.lng,
        count: artistsByCountry(c.name).length,
      })).filter((c) => c.count > 0),
    [],
  );
}
