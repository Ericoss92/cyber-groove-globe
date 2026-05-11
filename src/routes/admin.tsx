import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { storage, type AuthUser } from "@/lib/storage";
import { ShieldCheck, ShieldAlert, Trash2 } from "lucide-react";

/**
 * Mini "admin" console — purely local. In a real backend this would be
 * gated by a role. Here it's open so the user can flip the `authorized`
 * flag for accounts they registered.
 */
export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Console admin — SOUNDWAVE" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [users, setUsers] = useState<AuthUser[]>(() => storage.getUsers());

  function refresh() { setUsers(storage.getUsers()); }
  function toggle(u: AuthUser) { storage.setAuthorized(u.username, !u.authorized); refresh(); }
  function remove(u: AuthUser) {
    storage.setUsers(storage.getUsers().filter(x => x.username !== u.username));
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-pink)]">// ADMIN CONSOLE</p>
        <h1 className="font-display text-3xl glow-pink">Validation des accès</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bascule le flag <code className="font-mono">authorized</code> pour autoriser un compte à entrer dans la plateforme.
        </p>
      </header>

      <div className="glass rounded-2xl divide-y divide-[color:var(--neon-cyan)]/10">
        {users.length === 0 && <p className="p-6 text-sm text-muted-foreground font-mono">Aucun compte enregistré.</p>}
        {users.map(u => (
          <div key={u.username} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm">{u.username}</p>
              <p className="text-[10px] text-muted-foreground font-mono">créé {new Date(u.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => toggle(u)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition ${u.authorized ? "bg-[color:var(--neon-green)]/15 border-[color:var(--neon-green)] text-[color:var(--neon-green)]" : "bg-[color:var(--neon-pink)]/15 border-[color:var(--neon-pink)] text-[color:var(--neon-pink)]"}`}
              aria-pressed={u.authorized}>
              {u.authorized ? <><ShieldCheck className="size-3.5" /> AUTHORIZED</> : <><ShieldAlert className="size-3.5" /> PENDING</>}
            </button>
            <button onClick={() => remove(u)} aria-label={`Supprimer ${u.username}`}
              className="p-2 text-muted-foreground hover:text-[color:var(--neon-red)] transition">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
