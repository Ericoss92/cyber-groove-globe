import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { searchAll } from "@/data/music";
import { usePlayer } from "@/lib/player";
import type { Artist, Song } from "@/lib/types";

/**
 * Header — slim top bar containing only the sidebar trigger and the
 * global search. Primary navigation has moved into the AppSidebar.
 */
export default function Header() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ artists: Artist[]; songs: Song[] }>({ artists: [], songs: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  useEffect(() => {
    const id = setTimeout(() => setResults(searchAll(q)), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass border-b border-[color:var(--neon-green)]/30">
      <div className="flex items-center gap-3 px-3 md:px-5 py-2.5">
        <SidebarTrigger
          className="text-[color:var(--neon-cyan)] hover:text-[color:var(--neon-green)] focus-visible:ring-2 focus-visible:ring-[color:var(--neon-green)]"
          aria-label="Basculer la barre latérale"
        />
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--neon-cyan)]" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) { navigate({ to: "/search", search: { q } }); setOpen(false); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Chercher artiste, chanson…   (/)"
            aria-label="Rechercher"
            className="w-full pl-10 pr-3 py-2 rounded-md bg-[color:var(--surface)]/60 border border-[color:var(--neon-cyan)]/30 focus:border-[color:var(--neon-cyan)] focus:outline-none focus:ring-2 focus:ring-[color:var(--neon-cyan)]/40 font-mono text-sm placeholder:text-muted-foreground"
          />
          {open && q.trim().length >= 2 && (
            <div className="absolute mt-2 left-0 right-0 glass rounded-lg overflow-hidden shadow-2xl animate-rise">
              {results.artists.length === 0 && results.songs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground font-mono">Aucun résultat.</p>
              ) : (
                <>
                  {results.artists.length > 0 && (
                    <div className="p-2">
                      <p className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-widest text-[color:var(--neon-green)]">Artistes</p>
                      {results.artists.slice(0, 5).map(a => (
                        <Link key={a.slug} to="/artist/$slug" params={{ slug: a.slug }}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-2 py-2 rounded hover:bg-[color:var(--neon-green)]/10">
                          <img src={a.image} alt="" loading="lazy" className="size-9 rounded object-cover" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.genres.join(" · ")}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {results.songs.length > 0 && (
                    <div className="p-2 border-t border-[color:var(--neon-cyan)]/20">
                      <p className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-widest text-[color:var(--neon-pink)]">Chansons</p>
                      {results.songs.slice(0, 6).map(s => (
                        <button key={s.id} onClick={() => { playSong(s); setOpen(false); }}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-[color:var(--neon-pink)]/10 text-left">
                          <img src={s.cover} alt="" loading="lazy" className="size-9 rounded object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.artistName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Link to="/search" search={{ q }} onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-center text-xs font-mono text-[color:var(--neon-cyan)] border-t border-[color:var(--neon-cyan)]/20 hover:bg-[color:var(--neon-cyan)]/10">
                    Voir tous les résultats →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
