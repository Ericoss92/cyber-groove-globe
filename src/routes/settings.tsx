import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { storage, type Settings, type Theme } from "@/lib/storage";
import { ShieldCheck, ShieldAlert, Volume2, Sparkles, Cpu, User2 } from "lucide-react";

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

  useEffect(() => {
    storage.setSettings(s);
    // apply theme
    document.documentElement.setAttribute("data-theme", s.theme);
    document.documentElement.style.setProperty("--neon-intensity", String(s.neonIntensity));
  }, [s]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(prev => ({ ...prev, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// SYSTEM CONFIG</p>
        <h1 className="font-display text-4xl glow-green">Paramètres</h1>
      </header>

      {/* Audio Engine */}
      <Card title="Moteur audio" icon={<Volume2 className="size-4" />} accent="green">
        <Row label="Lecture sans coupure (Gapless)" desc="Élimine le silence entre les pistes consécutives.">
          <Toggle checked={s.gapless} onChange={(v) => update("gapless", v)} label="Gapless" />
        </Row>
        <Row label={`Crossfade : ${s.crossfade.toFixed(1)} s`} desc="Fondu enchaîné entre la fin d'une piste et le début de la suivante.">
          <input type="range" min={0} max={10} step={0.5} value={s.crossfade}
            onChange={(e) => update("crossfade", parseFloat(e.target.value))}
            aria-label="Durée du crossfade en secondes"
            className="w-56 accent-[color:var(--neon-green)]" />
        </Row>
      </Card>

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
