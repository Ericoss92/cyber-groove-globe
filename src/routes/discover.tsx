import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useState } from "react";
import SongCard from "@/components/SongCard";
import ArtistCard from "@/components/ArtistCard";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { PeriodFilter, type Period } from "@/components/PeriodFilter";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [{ title: "Découverte · SOUNDWAVE" }] }),
  component: DiscoverPage,
});

function SectionTitle({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">{kicker}</p>
        <h2 className="font-display text-2xl glow-pink">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function CardSkeleton() {
  return <div className="w-44 h-60 shrink-0 rounded-xl glass animate-pulse" />;
}

function DiscoverPage() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, loading, error, hasCatalog } = useDiscoverData(period);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8 space-y-12">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Compass className="size-7 text-[color:var(--neon-green)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// DISCOVERY ENGINE</p>
            <h1 className="font-display text-4xl glow-green">Découverte</h1>
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </header>

      {error && (
        <div className="rounded-lg border border-[color:var(--neon-pink)]/40 bg-[color:var(--neon-pink)]/5 p-4 text-sm font-mono text-[color:var(--neon-pink)]">
          // {error}
        </div>
      )}

      {/* SECTION 1 — recent (always personal, no period) */}
      <section>
        <SectionTitle kicker="// RECENT · MOI" title="Tes 10 derniers sons" />
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : data?.recent.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {data.recent.map(s => (
              <div key={s.id} className="snap-start"><SongCard song={s} queue={data.recent} /></div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-mono">// aucune écoute encore — lance ta première chanson</p>
        )}
      </section>

      {/* SECTION 2 — top artists (global, filtered by period) */}
      <section>
        <SectionTitle kicker="// TOP · GLOBAL" title="Top artistes" />
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-44 rounded-xl glass animate-pulse" />)}
          </div>
        ) : data?.topArtists.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {data.topArtists.map(a => <ArtistCard key={a.slug} artist={a} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-mono">// pas assez de données sur cette période</p>
        )}
      </section>


      {/* SECTION 3 — suggestions */}
      <section>
        <SectionTitle kicker="// FOR YOU" title="Suggestions populaires" />
        {!hasCatalog ? (
          <p className="text-sm text-muted-foreground font-mono">
            // catalogue local vide — copie ta musique dans <code>/public/music</code> puis exécute <code>npm run index-music</code>
          </p>
        ) : loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : data?.suggestions.length ? (
          <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-2 snap-y sm:snap-x snap-mandatory">
            {data.suggestions.map(s => (
              <div key={s.id} className="snap-start"><SongCard song={s} queue={data.suggestions} /></div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-mono">// aucune suggestion disponible</p>
        )}
      </section>
    </div>
  );
}
