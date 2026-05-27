import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { storage, type Settings, type Theme } from "@/lib/storage";
import { ShieldCheck, ShieldAlert, Sparkles, Cpu, User2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useStats } from "@/hooks/useStats";
import { api } from "@/api/client";
import { AudioPreferencesBlock } from "@/components/AudioPreferencesBlock";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — SOUNDWAVE" },
      { name: "description", content: "Configurez le moteur audio, les thèmes visuels, les performances et votre compte." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<Settings>(storage.getSettings());
  const user = storage.currentUser();

  // Server-backed audio prefs (mirror of /api/user/preferences)
  const [volume, setVolume] = useState(75);
  const [crossfade, setCrossfade] = useState(3);
  const [gapless, setGapless] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    storage.setSettings(s);
    document.documentElement.setAttribute("data-theme", s.theme);
    document.documentElement.style.setProperty("--neon-intensity", String(s.neonIntensity));
  }, [s]);

  useEffect(() => {
    api.getPreferences()
      .then((p: any) => {
        if (!p) return;
        const vol = typeof p.volume === "number" ? p.volume : 75;
        setVolume(vol <= 1 ? Math.round(vol * 100) : Math.round(vol));
        setCrossfade(p.crossfade_duration ?? 3);
        setGapless(!!p.gapless_playback);
      })
      .catch(() => {});
  }, []);

  async function saveAudio() {
    setSaveState("saving"); setErrorMsg(null);
    try {
      await api.updatePreferences({
        volume,
        crossfade_duration: crossfade,
        gapless_playback: gapless,
      });
      setSaveState("success");
      toast.success("Préférences sauvegardées");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e: any) {
      const msg = e?.message || "Erreur sauvegarde";
      setSaveState("error"); setErrorMsg(msg);
      toast.error(msg);
    }
  }

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// SYSTEM CONFIG</p>
        <h1 className="font-display text-4xl glow-green">Paramètres</h1>
      </header>

      {/* Audio Engine — shared block, persists to API */}
      <AudioPreferencesBlock
        volume={volume}
        crossfade={crossfade}
        gapless={gapless}
        onVolumeChange={setVolume}
        onCrossfadeChange={setCrossfade}
        onGaplessChange={setGapless}
        onSave={saveAudio}
        saveState={saveState}
        errorMsg={errorMsg}
      />


      {/* Visual Themes */}
      <Card title="Thèmes visuels" icon={<Sparkles className="size-4" />} accent="pink">
        <Row label="Palette" desc="Sélectionnez l'identité visuelle de l'interface.">
          <div className="flex gap-2 flex-wrap">
            {(["cyberpunk", "midnight", "monochrome"] as Theme[]).map(t => (
              <button key={t} onClick={() => update("theme", t)} aria-pressed={s.theme === t}
                className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border transition ${s.theme === t ? "bg-[color:var(--neon-pink)]/15 border-[color:var(--neon-pink)] text-[color:var(--neon-pink)]" : "border-border hover:border-[color:var(--neon-pink)]/50"}`}>
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row label={`Intensité néon : ${Math.round(s.neonIntensity * 100)} %`} desc="Réduit l'éclat des effets néon (utile sur OLED).">
          <input type="range" min={0.2} max={1} step={0.05} value={s.neonIntensity}
            onChange={(e) => update("neonIntensity", parseFloat(e.target.value))}
            aria-label="Intensité des effets néon"
            className="w-56 accent-[color:var(--neon-pink)]" />
        </Row>
      </Card>

      {/* Performance */}
      <Card title="Performance" icon={<Cpu className="size-4" />} accent="cyan">
        <Row label="Mode économie GPU" desc="Réduit la densité des particules de fond et la précision du rendu.">
          <Toggle checked={s.lowPerf} onChange={(v) => update("lowPerf", v)} label="Économie GPU" />
        </Row>
      </Card>

      {/* Account */}
      <Card title="Compte" icon={<User2 className="size-4" />} accent="green">
        <Row label="Identifiant" desc={user?.username ? `Connecté en tant que ${user.username}` : "Non connecté"}>
          <span className="font-mono text-sm">{user?.username ?? "—"}</span>
        </Row>
        <Row label="Statut d'accès" desc="Validé manuellement par l'administrateur.">
          {user?.authorized ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono bg-[color:var(--neon-green)]/15 text-[color:var(--neon-green)] border border-[color:var(--neon-green)]/40">
              <ShieldCheck className="size-3.5" /> AUTHORIZED · VIP
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono bg-[color:var(--neon-pink)]/15 text-[color:var(--neon-pink)] border border-[color:var(--neon-pink)]/40">
              <ShieldAlert className="size-3.5" /> PENDING
            </span>
          )}
        </Row>
      </Card>

      <StatsCard />
    </div>
  );
}

function StatsCard() {
  const { data, error, loading, refresh } = useStats();
  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-display text-lg text-[color:var(--neon-cyan)]">
          <BarChart3 className="size-4" /> Statistiques d'écoute
        </h2>
        <button onClick={refresh} className="text-[10px] font-mono text-muted-foreground hover:text-[color:var(--neon-cyan)]">
          {loading ? "…" : "↻ refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs font-mono text-muted-foreground">
          // backend hors-ligne — démarrez le serveur Node : <code className="text-[color:var(--neon-pink)]">cd server &amp;&amp; npm run dev</code>
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <Stat label="Minutes" value={data.totalListeningTimeMinutes} accent="green" />
            <Stat label="Écoutes" value={data.totalSongsPlayed} accent="cyan" />
            <Stat label="Top artiste" value={data.favoriteArtist ?? "—"} accent="pink" small />
            <Stat label="Top pays" value={data.favoriteCountry ?? "—"} accent="cyan" small />
          </div>
          <TopList title="Top 10 artistes" items={data.topArtists} />
          <TopList title="Top 10 genres" items={data.topGenres} />
          <TopList title="Top 10 pays" items={data.topCountries} />
        </div>
      )}

      {!data && !error && loading && <p className="text-xs font-mono text-muted-foreground">// chargement…</p>}

      <p className="mt-4 text-[10px] font-mono text-muted-foreground">
        Données depuis le backend Node/MariaDB. Voir aussi <Link to="/admin-approval" className="text-[color:var(--neon-pink)] underline">console admin</Link>.
      </p>
    </section>
  );
}

function Stat({ label, value, accent, small }: { label: string; value: any; accent: "green" | "cyan" | "pink"; small?: boolean }) {
  const c = accent === "green" ? "text-[color:var(--neon-green)]" : accent === "pink" ? "text-[color:var(--neon-pink)]" : "text-[color:var(--neon-cyan)]";
  return (
    <div className="rounded-md bg-[color:var(--surface)]/40 p-3 border border-[color:var(--neon-cyan)]/10">
      <p className={`font-display ${small ? "text-sm truncate" : "text-2xl"} ${c}`}>{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  if (!items?.length) return null;
  const max = Math.max(...items.map(i => i.count));
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1">
        {items.slice(0, 10).map((it, i) => (
          <div key={`${it.name}-${i}`} className="flex items-center gap-2 text-xs font-mono">
            <span className="w-5 text-muted-foreground">{i + 1}.</span>
            <span className="flex-1 truncate">{it.name}</span>
            <span className="w-32 h-1.5 bg-[color:var(--surface)] rounded-full overflow-hidden">
              <span className="block h-full bg-[color:var(--neon-green)]" style={{ width: `${(it.count / max) * 100}%` }} />
            </span>
            <span className="w-10 text-right text-muted-foreground">{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: "green" | "pink" | "cyan"; children: React.ReactNode }) {
  const accentClass = accent === "green" ? "text-[color:var(--neon-green)]" : accent === "pink" ? "text-[color:var(--neon-pink)]" : "text-[color:var(--neon-cyan)]";
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className={`flex items-center gap-2 font-display text-lg mb-4 ${accentClass}`}>{icon} {title}</h2>
      <div className="divide-y divide-[color:var(--neon-cyan)]/10">{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition focus-visible:ring-2 focus-visible:ring-[color:var(--neon-green)] ${checked ? "bg-[color:var(--neon-green)]" : "bg-[color:var(--surface)] border border-border"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-[color:var(--background)] transition ${checked ? "left-6" : "left-0.5"}`} />
    </button>
  );
}
