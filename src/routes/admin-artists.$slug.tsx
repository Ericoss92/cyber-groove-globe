import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { api, cachedUser } from "@/api/client";
import { artistBySlug } from "@/data/music";

export const Route = createFileRoute("/admin-artists/$slug")({
  head: () => ({ meta: [{ title: "Édition artiste · SOUNDWAVE" }] }),
  component: AdminArtistEditPage,
});

function AdminArtistEditPage() {
  const u = cachedUser.get();
  if (!u?.admin) return <Navigate to="/" />;
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const generated = artistBySlug(slug);

  const [form, setForm] = useState({
    biography: "", yearsActive: "", mainGenre: "",
    description: "", imageUrl: "", country: "",
    instagram: "", twitter: "", youtube: "", spotify: "",
    adminNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminGetArtist(slug).then((m: any) => {
      if (!m) {
        setForm(f => ({
          ...f,
          biography: generated?.bio || "",
          country: generated?.country || "",
          mainGenre: generated?.genres?.[0] || "",
          imageUrl: generated?.image || "",
          yearsActive: generated?.foundedYear ? `${generated.foundedYear}–présent` : "",
        }));
        return;
      }
      const s = m.socialLinks || {};
      setForm({
        biography: m.biography || "",
        yearsActive: m.yearsActive || "",
        mainGenre: m.mainGenre || "",
        description: m.description || "",
        imageUrl: m.imageUrl || generated?.image || "",
        country: m.country || generated?.country || "",
        instagram: s.instagram || "", twitter: s.twitter || "",
        youtube: s.youtube || "", spotify: s.spotify || "",
        adminNotes: "",
      });
    }).catch(() => {});
  }, [slug, generated]);

  async function save() {
    setSaving(true); setError(null);
    try {
      const socialLinks: Record<string, string> = {};
      if (form.instagram) socialLinks.instagram = form.instagram;
      if (form.twitter) socialLinks.twitter = form.twitter;
      if (form.youtube) socialLinks.youtube = form.youtube;
      if (form.spotify) socialLinks.spotify = form.spotify;
      await api.adminUpdateArtist(slug, {
        biography: form.biography || null,
        yearsActive: form.yearsActive || null,
        mainGenre: form.mainGenre || null,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        country: form.country || null,
        socialLinks: Object.keys(socialLinks).length ? socialLinks : null,
        adminNotes: form.adminNotes || null,
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || "Erreur sauvegarde");
    } finally { setSaving(false); }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 space-y-5">
      <button onClick={() => navigate({ to: "/admin-artists" })}
        className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-[color:var(--neon-cyan)]">
        <ArrowLeft className="size-3.5" /> retour à la liste
      </button>

      <header className="flex items-center gap-4">
        <img src={form.imageUrl || generated?.image} alt="" className="size-20 rounded-xl object-cover box-glow-cyan" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ARTIST EDIT</p>
          <h1 className="font-display text-3xl glow-green truncate">{generated?.name || slug}</h1>
          <p className="text-xs font-mono text-muted-foreground">{slug}</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-[color:var(--neon-pink)]/40 p-3 text-xs font-mono text-[color:var(--neon-pink)]">// {error}</div>}

      <section className="glass rounded-xl p-5 space-y-4">
        <Field label="Image (URL)" value={form.imageUrl} onChange={set("imageUrl")} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Pays" value={form.country} onChange={set("country")} />
          <Field label="Genre principal" value={form.mainGenre} onChange={set("mainGenre")} />
        </div>
        <Field label="Années d'activité" value={form.yearsActive} onChange={set("yearsActive")} placeholder="ex: 1995–présent" />
        <TextArea label="Description courte" value={form.description} onChange={set("description")} rows={2} />
        <TextArea label="Biographie" value={form.biography} onChange={set("biography")} rows={6} />
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <h2 className="font-display text-sm text-[color:var(--neon-pink)]">Liens sociaux</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram" value={form.instagram} onChange={set("instagram")} />
          <Field label="Twitter / X" value={form.twitter} onChange={set("twitter")} />
          <Field label="YouTube" value={form.youtube} onChange={set("youtube")} />
          <Field label="Spotify" value={form.spotify} onChange={set("spotify")} />
        </div>
      </section>

      <section className="glass rounded-xl p-5 space-y-3">
        <TextArea label="Notes admin (privées)" value={form.adminNotes} onChange={set("adminNotes")} rows={3} />
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition disabled:opacity-60">
          <Save className="size-4" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        {savedAt && <span className="text-xs font-mono text-[color:var(--neon-green)]">// enregistré {savedAt}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <input value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-[color:var(--surface)]/50 border border-[color:var(--neon-cyan)]/20 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--neon-cyan)]" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: any; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <textarea value={value} onChange={onChange} rows={rows}
        className="w-full bg-[color:var(--surface)]/50 border border-[color:var(--neon-cyan)]/20 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--neon-cyan)] resize-y" />
    </label>
  );
}
