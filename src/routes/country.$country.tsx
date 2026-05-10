import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { artistsByCountry, COUNTRIES } from "@/data/music";
import { Play } from "lucide-react";
import { usePlayer } from "@/lib/player";

export const Route = createFileRoute("/country/$country")({
  loader: ({ params }) => {
    const c = COUNTRIES.find(x => x.name.toLowerCase() === params.country.toLowerCase());
    if (!c) throw notFound();
    return { country: c };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.country.name ?? "Pays"} — Artistes · SOUNDWAVE` },
      { name: "description", content: `Découvrez tous les artistes de ${loaderData?.country.name}.` },
    ],
  }),
  component: CountryPage,
  notFoundComponent: () => <div className="p-12 text-center"><h1 className="font-display text-3xl glow-pink">Pays introuvable</h1></div>,
});

function CountryPage() {
  const { country } = Route.useLoaderData();
  const all = useMemo(() => artistsByCountry(country.name), [country]);
  const allGenres = useMemo(() => [...new Set(all.flatMap(a => a.genres))], [all]);
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<"az" | "pop">("pop");
  const p = usePlayer();

  const filtered = useMemo(() => {
    let list = genre === "all" ? all : all.filter(a => a.genres.includes(genre));
    list = [...list].sort((a, b) => sort === "az" ? a.name.localeCompare(b.name) : b.followers - a.followers);
    return list;
  }, [all, genre, sort]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
      <nav className="text-xs font-mono text-muted-foreground mb-4">
        <Link to="/" className="hover:text-[color:var(--neon-green)]">MONDE</Link>
        <span className="mx-2">›</span>
        <span className="text-[color:var(--neon-cyan)]">{country.continent.toUpperCase()}</span>
        <span className="mx-2">›</span>
        <span className="text-[color:var(--neon-pink)]">{country.name.toUpperCase()}</span>
      </nav>

      <header className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl glow-green flex items-center gap-3">
            <span className="text-5xl">{country.flag}</span> Artistes de {country.name}
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">{all.length} artistes · {country.continent}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-mono text-muted-foreground">Genre</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="bg-[color:var(--surface)] border border-[color:var(--neon-cyan)]/30 rounded px-2 py-1.5 text-sm font-mono">
            <option value="all">Tous</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <label className="text-xs font-mono text-muted-foreground ml-3">Tri</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as "az" | "pop")}
            className="bg-[color:var(--surface)] border border-[color:var(--neon-pink)]/30 rounded px-2 py-1.5 text-sm font-mono">
            <option value="pop">Populaire</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucun artiste pour ce filtre.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((a, i) => (
            <Link key={a.slug} to="/artist/$slug" params={{ slug: a.slug }}
              className="group relative rounded-xl overflow-hidden glass hover:scale-[1.03] transition animate-rise"
              style={{ animationDelay: `${i * 40}ms` }}>
              <div className="aspect-square overflow-hidden">
                <img src={a.image} alt={a.name} loading="lazy" className="size-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--background)] to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-display font-bold truncate group-hover:glow-green hover-glitch">{a.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{a.genres.slice(0,2).join(" · ")}</p>
              </div>
              <button onClick={(e) => { e.preventDefault(); p.playQueue(a.songs, 0); }}
                aria-label={`Lire ${a.name}`}
                className="absolute top-3 right-3 size-10 rounded-full bg-[color:var(--neon-green)] text-[color:var(--background)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition box-glow-green">
                <Play className="size-4 ml-0.5" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
