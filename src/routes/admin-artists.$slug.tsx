import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, ExternalLink, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { api, cachedUser } from "@/api/client";
import { artistBySlug } from "@/data/music";

export const Route = createFileRoute("/admin-artists/$slug")({
  head: () => ({ meta: [{ title: "Édition artiste · SOUNDWAVE" }] }),
  component: AdminArtistEditPage,
});

type FormState = {
  biography: string;
  yearsActive: string;
  mainGenre: string;
  description: string;
  imageUrl: string;
  country: string;
  instagram: string;
  twitter: string;
  youtube: string;
  spotify: string;
  website: string;
  adminNotes: string;
};

const EMPTY_FORM: FormState = {
  biography: "", yearsActive: "", mainGenre: "",
  description: "", imageUrl: "", country: "",
  instagram: "", twitter: "", youtube: "", spotify: "", website: "",
  adminNotes: "",
};

function AdminArtistEditPage() {
  // Hooks always called — never after a conditional return.
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const generated = useMemo(() => artistBySlug(slug), [slug]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const u = cachedUser.get();
  const isAdmin = !!u?.admin;

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setLoading(true);
    api.adminGetArtist(slug).then((m: any) => {
      if (!active) return;
      if (!m) {
        setForm({
          ...EMPTY_FORM,
          biography: generated?.bio || "",
          country: generated?.country || "",
          mainGenre: generated?.genres?.[0] || "",
          imageUrl: generated?.image || "",
          yearsActive: generated?.foundedYear ? `${generated.foundedYear}–présent` : "",
          instagram: generated?.socials?.instagram || "",
          twitter: generated?.socials?.twitter || "",
          youtube: generated?.socials?.youtube || "",
          spotify: generated?.socials?.spotify || "",
        });
      } else {
        const s = m.socialLinks || {};
        setForm({
          biography: m.biography || "",
          yearsActive: m.yearsActive || "",
          mainGenre: m.mainGenre || "",
          description: m.description || "",
          imageUrl: m.imageUrl || generated?.image || "",
          country: m.country || generated?.country || "",
          instagram: s.instagram || generated?.socials?.instagram || "",
          twitter: s.twitter || generated?.socials?.twitter || "",
          youtube: s.youtube || generated?.socials?.youtube || "",
          spotify: s.spotify || generated?.socials?.spotify || "",
          website: s.website || "",
          adminNotes: m.adminNotes || "",
        });
      }
      setImgError(false);
    }).catch(() => {
      toast.error("Impossible de charger les métadonnées");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug, generated, isAdmin]);

  async function save() {
    setSaving(true);
    try {
      const socialLinks: Record<string, string> = {};
      if (form.instagram) socialLinks.instagram = form.instagram;
      if (form.twitter) socialLinks.twitter = form.twitter;
      if (form.youtube) socialLinks.youtube = form.youtube;
      if (form.spotify) socialLinks.spotify = form.spotify;
      if (form.website) socialLinks.website = form.website;
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
      toast.success("Métadonnées sauvegardées");
    } catch (e: any) {
      toast.error(e?.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return <Navigate to="/" />;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const previewSrc = (!imgError && form.imageUrl) || generated?.image || "";

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8 space-y-5">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => navigate({ to: "/admin-artists" })}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground hover:text-[color:var(--neon-cyan)] hover:border-[color:var(--neon-cyan)]/50 transition">
          <ArrowLeft className="size-3.5" /> Liste des artistes
        </button>
        <Link to="/artist/$slug" params={{ slug }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground hover:text-[color:var(--neon-pink)] hover:border-[color:var(--neon-pink)]/50 transition">
          <ExternalLink className="size-3.5" /> Voir la page publique
        </Link>
        <div className="flex-1" />
        <button onClick={save} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition disabled:opacity-60 disabled:cursor-not-allowed">
          <Save className="size-4" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ARTIST EDIT</p>
        <h1 className="font-display text-3xl md:text-4xl glow-green truncate">
          Éditer {generated?.name || slug}
        </h1>
        <p className="text-xs font-mono text-muted-foreground">
          slug: {slug} · {form.country || generated?.country || "—"} · {form.mainGenre || generated?.genres?.[0] || "—"}
          {savedAt && <span className="ml-2 text-[color:var(--neon-green)]">// enregistré à {savedAt}</span>}
        </p>
      </header>

      {loading ? (
        <p className="text-xs font-mono text-muted-foreground">// chargement des métadonnées…</p>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-5">
          {/* LEFT — preview */}
          <aside className="space-y-4">
            <div className="glass rounded-xl p-3 box-glow-cyan">
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-[color:var(--surface)]/60 flex items-center justify-center">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt="Aperçu artiste"
                    className="size-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <ImageOff className="size-10 text-muted-foreground/40" />
                )}
              </div>
              <p className="mt-2 text-[10px] font-mono text-muted-foreground text-center truncate">
                {imgError ? "image cassée — fallback catalogue" : "aperçu image"}
              </p>
            </div>
            <div className="glass rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--neon-cyan)]">// quick info</p>
              <p className="text-xs font-mono"><span className="text-muted-foreground">Pays :</span> {form.country || "—"}</p>
              <p className="text-xs font-mono"><span className="text-muted-foreground">Genre :</span> {form.mainGenre || "—"}</p>
              <p className="text-xs font-mono"><span className="text-muted-foreground">Activité :</span> {form.yearsActive || "—"}</p>
            </div>
          </aside>

          {/* RIGHT — form */}
          <div className="space-y-5 min-w-0">
            <Section title="Identité" accent="cyan">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Pays" value={form.country} onChange={set("country")} />
                <Field label="Genre principal" value={form.mainGenre} onChange={set("mainGenre")} />
              </div>
              <Field label="Années d'activité" value={form.yearsActive} onChange={set("yearsActive")} placeholder="ex: 1995–présent" />
            </Section>

            <Section title="Présentation" accent="green">
              <TextArea label="Description courte" value={form.description} onChange={set("description")} rows={2} placeholder="Une phrase qui résume l'artiste" />
              <TextArea label="Biographie" value={form.biography} onChange={set("biography")} rows={8} placeholder="Bio complète, retour à la ligne autorisé" />
            </Section>

            <Section title="Image" accent="pink">
              <Field label="URL de l'image" value={form.imageUrl} onChange={(e) => { setImgError(false); setForm(f => ({ ...f, imageUrl: e.target.value })); }} placeholder="https://…" />
              <p className="text-[10px] font-mono text-muted-foreground">
                Si vide ou cassée, l'image du catalogue local est utilisée comme fallback.
              </p>
            </Section>

            <Section title="Liens sociaux" accent="cyan">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Instagram" value={form.instagram} onChange={set("instagram")} />
                <Field label="Twitter / X" value={form.twitter} onChange={set("twitter")} />
                <Field label="YouTube" value={form.youtube} onChange={set("youtube")} />
                <Field label="Spotify" value={form.spotify} onChange={set("spotify")} />
                <Field label="Site web" value={form.website} onChange={set("website")} />
              </div>
            </Section>

            <Section title="Notes admin (privées)" accent="pink">
              <TextArea label="Notes internes" value={form.adminNotes} onChange={set("adminNotes")} rows={3} placeholder="Visible uniquement par les admins" />
            </Section>

            <div className="flex items-center gap-3 pb-4">
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-105 transition disabled:opacity-60">
                <Save className="size-4" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              {savedAt && <span className="text-xs font-mono text-[color:var(--neon-green)]">// enregistré {savedAt}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: "cyan" | "green" | "pink"; children: React.ReactNode }) {
  const color =
    accent === "cyan" ? "text-[color:var(--neon-cyan)]" :
    accent === "green" ? "text-[color:var(--neon-green)]" :
    "text-[color:var(--neon-pink)]";
  return (
    <section className="glass rounded-xl p-5 space-y-4">
      <h2 className={`font-display text-sm uppercase tracking-widest ${color}`}>// {title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <input value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-[color:var(--surface)]/50 border border-[color:var(--neon-cyan)]/20 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--neon-cyan)]" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: any; rows?: number; placeholder?: string }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full bg-[color:var(--surface)]/50 border border-[color:var(--neon-cyan)]/20 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--neon-cyan)] resize-y" />
    </label>
  );
}
