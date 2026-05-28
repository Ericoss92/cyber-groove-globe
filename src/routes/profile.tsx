import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api, cachedUser, tokens } from "@/api/client";
import { useProfile } from "@/hooks/useProfile";
import { useStats } from "@/hooks/useStats";
import { storage } from "@/lib/storage";
import { clearUserCaches } from "@/lib/library";
import { AudioPreferencesBlock } from "@/components/AudioPreferencesBlock";


export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil · SOUNDWAVE" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const u = cachedUser.get();
  if (!u?.authorized) return <Navigate to="/login" />;

  const navigate = useNavigate();
  const { data: profile, loading, error, refresh } = useProfile();
  const { data: stats } = useStats();

  const [volume, setVolume] = useState(75);
  const [crossfade, setCrossfade] = useState(3);
  const [gapless, setGapless] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load real preferences from API
  useEffect(() => {
    let active = true;
    api.getPreferences()
      .then((p: any) => {
        if (!active || !p) return;
        const vol = typeof p.volume === "number" ? p.volume : 75;
        // accept both 0-1 and 0-100 backends
        setVolume(vol <= 1 ? Math.round(vol * 100) : Math.round(vol));
        setCrossfade(p.crossfade_duration ?? 3);
        setGapless(!!p.gapless_playback);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function save() {
    setSaveState("saving"); setErrorMsg(null);
    try {
      await api.updatePreferences({
        volume,
        crossfade_duration: crossfade,
        gapless_playback: gapless,
      });
      setSaveState("success");
      toast.success("Préférences sauvegardées");
      refresh();
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e: any) {
      const msg = e?.message || "Erreur sauvegarde";
      setSaveState("error"); setErrorMsg(msg);
      toast.error(msg);
    }
  }

  async function logout() {
    try { await api.logout(); } catch {}
    tokens.clear();
    storage.logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <UserIcon className="size-7 text-[color:var(--neon-pink)]" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ACCOUNT</p>
          <h1 className="font-display text-3xl md:text-4xl glow-pink">Mon profil</h1>
        </div>
      </header>

      {error && <div className="rounded-lg border border-[color:var(--neon-pink)]/40 p-3 text-sm font-mono text-[color:var(--neon-pink)]">// {error}</div>}

      {/* INFOS COMPTE */}
      <section className="glass rounded-xl p-5 space-y-2">
        <h2 className="font-display text-lg glow-green mb-2">Infos compte</h2>
        {loading ? <p className="text-sm font-mono text-muted-foreground">chargement…</p> : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Username</dt><dd>{profile?.username ?? u.username}</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Email</dt><dd className="truncate">{profile?.email ?? "—"}</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Créé le</dt><dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</dd></div>
            <div>
              <dt className="font-mono text-[10px] text-muted-foreground uppercase">Statut</dt>
              <dd>
                {profile?.authorized
                  ? <span className="text-[color:var(--neon-green)]">✅ Autorisé</span>
                  : <span className="text-[color:var(--neon-pink)]">⏳ En attente</span>}
                {profile?.is_admin && <span className="ml-2 text-[color:var(--neon-cyan)]">· admin</span>}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <AudioPreferencesBlock
        volume={volume}
        crossfade={crossfade}
        gapless={gapless}
        onVolumeChange={setVolume}
        onCrossfadeChange={setCrossfade}
        onGaplessChange={setGapless}
        onSave={save}
        saveState={saveState}
        errorMsg={errorMsg}
      />


      {/* STATS */}
      <section className="glass rounded-xl p-5 space-y-2">
        <h2 className="font-display text-lg glow-pink mb-2">Mes statistiques</h2>
        {stats ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Écoutes</dt><dd>{stats.totalSongsPlayed}</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Durée</dt><dd>{Math.floor(stats.totalListeningTimeMinutes / 60)}h {stats.totalListeningTimeMinutes % 60}min</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Artiste favori</dt><dd className="truncate">{stats.favoriteArtist ?? "—"}</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Genre favori</dt><dd className="truncate">{stats.favoriteGenre ?? "—"}</dd></div>
            <div><dt className="font-mono text-[10px] text-muted-foreground uppercase">Pays favori</dt><dd className="truncate">{stats.favoriteCountry ?? "—"}</dd></div>
          </dl>
        ) : <p className="text-sm font-mono text-muted-foreground">// pas encore d'écoute</p>}
      </section>

      {/* SÉCURITÉ */}
      <section className="glass rounded-xl p-5 space-y-3">
        <h2 className="font-display text-lg glow-green">Sécurité</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[color:var(--neon-pink)]/50 text-sm hover:bg-[color:var(--neon-pink)]/10">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      </section>
    </div>
  );
}
