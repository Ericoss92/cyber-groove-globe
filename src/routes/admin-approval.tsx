import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, tokens, cachedUser, type ApiUser } from "@/api/client";
import { ShieldCheck, ShieldAlert, Trash2, RefreshCw, Filter, ScrollText } from "lucide-react";

export const Route = createFileRoute("/admin-approval")({
  head: () => ({
    meta: [
      { title: "Approbation des accès — SOUNDWAVE" },
      { name: "description", content: "Console d'administration : approuver, rejeter, supprimer les comptes utilisateur." },
    ],
  }),
  component: AdminApprovalPage,
});

function AdminApprovalPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<ApiUser | null>(() => cachedUser.get());
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "authorized" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens.access) { navigate({ to: "/login" }); return; }
    api.me().then(u => {
      setMe(u);
      if (!u.admin) navigate({ to: "/" });
    }).catch(() => navigate({ to: "/login" }));
  }, [navigate]);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const [u, l] = await Promise.all([api.adminUsers(filter), api.adminLogs(20)]);
      setUsers(u as any[]); setLogs(l as any[]);
    } catch (e: any) { setErr(e.message || "Erreur réseau (backend hors-ligne ?)"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (me?.admin) refresh(); /* eslint-disable-next-line */ }, [me, filter]);

  async function authorize(u: any, approved: boolean) {
    await api.adminAuthorize(u.id, approved); refresh();
  }
  async function remove(u: any) {
    if (!confirm(`Supprimer définitivement ${u.username} ?`)) return;
    await api.adminDeleteUser(u.id); refresh();
  }

  if (!me?.admin) {
    return <div className="p-12 text-center font-mono text-sm text-muted-foreground">// vérification des privilèges…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-pink)]">// ADMIN CONSOLE</p>
          <h1 className="font-display text-4xl glow-pink">Approbation des accès</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">Connecté en tant que <strong>{me.username}</strong> · admin</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          {(["pending", "authorized", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border transition ${filter === f ? "bg-[color:var(--neon-cyan)]/15 border-[color:var(--neon-cyan)] text-[color:var(--neon-cyan)]" : "border-border hover:border-[color:var(--neon-cyan)]/50"}`}>
              {f}
            </button>
          ))}
          <button onClick={refresh} aria-label="Rafraîchir"
            className="p-2 rounded-md border border-border hover:border-[color:var(--neon-green)] transition">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {err && <p role="alert" className="glass rounded-lg p-3 text-sm text-[color:var(--neon-pink)] font-mono">{err}</p>}

      <section className="glass rounded-2xl divide-y divide-[color:var(--neon-cyan)]/10">
        {users.length === 0 && !loading && (
          <p className="p-6 text-sm text-muted-foreground font-mono text-center">// aucun utilisateur</p>
        )}
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm">{u.username}{u.is_admin ? <span className="ml-2 text-[10px] text-[color:var(--neon-cyan)]">[ADMIN]</span> : null}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                créé {new Date(u.createdAt).toLocaleDateString()}
                {u.lastLogin ? ` · dernière connexion ${new Date(u.lastLogin).toLocaleDateString()}` : ""}
              </p>
            </div>
            {u.authorized ? (
              <button onClick={() => authorize(u, false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border bg-[color:var(--neon-green)]/15 border-[color:var(--neon-green)] text-[color:var(--neon-green)]">
                <ShieldCheck className="size-3.5" /> AUTHORIZED
              </button>
            ) : (
              <button onClick={() => authorize(u, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border bg-[color:var(--neon-pink)]/15 border-[color:var(--neon-pink)] text-[color:var(--neon-pink)] hover:bg-[color:var(--neon-pink)]/25 transition">
                <ShieldAlert className="size-3.5" /> APPROUVER
              </button>
            )}
            <button onClick={() => remove(u)} aria-label={`Supprimer ${u.username}`}
              className="p-2 text-muted-foreground hover:text-[color:var(--neon-red)] transition">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-[color:var(--neon-cyan)] mb-3">
          <ScrollText className="size-4" /> Logs administrateur
        </h2>
        <div className="space-y-1.5 max-h-72 overflow-auto">
          {logs.length === 0 && <p className="text-xs font-mono text-muted-foreground">// aucun log</p>}
          {logs.map(l => (
            <div key={l.id} className="text-xs font-mono flex gap-3 border-b border-[color:var(--neon-cyan)]/10 pb-1.5">
              <span className="text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
              <span className="text-[color:var(--neon-pink)] shrink-0">{l.action}</span>
              <span className="text-[color:var(--neon-cyan)] shrink-0">{l.adminUsername}</span>
              <span className="truncate">→ {l.targetUsername} {l.details ? `· ${l.details}` : ""}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center">
        <Link to="/" className="text-[10px] font-mono text-muted-foreground hover:text-[color:var(--neon-cyan)] underline">← retour</Link>
      </p>
    </div>
  );
}
