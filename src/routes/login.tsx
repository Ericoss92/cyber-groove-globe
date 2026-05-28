import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { cachedUser } from "@/api/client";
import { clearUserCaches } from "@/lib/library";
import Logo from "@/components/Logo";
import { ShieldCheck, KeyRound, UserPlus } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accès — SOUNDWAVE" },
      { name: "description", content: "Plateforme musicale privée. Accès sur invitation uniquement." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already authenticated AND authorized, jump to /
  useEffect(() => {
    const api = cachedUser.get();
    if (api?.authorized) { navigate({ to: "/" }); return; }
    const u = storage.currentUser();
    if (u?.authorized) navigate({ to: "/" });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    // Wipe any leftover cache from a previous user before authenticating.
    clearUserCaches();
    // 1) Try real backend (Node/Express + MariaDB)
    try {
      const { api } = await import("@/api/client");
      if (mode === "register") {
        await api.register(username, password);
        setInfo("Compte créé. Accès en attente de validation par l'administrateur.");
        return;
      } else {
        const r = await api.login(username, password);
        // sync local gatekeeper so existing UI keeps working
     	if (r.user.authorized) {
  	cachedUser.set(r.user);

  	storage.setUsers([
    	 {
      		username: r.user.username,
      		passwordHash: "api",
      		authorized: true,
      		createdAt: new Date().toISOString(),
    	  },
    	...storage.getUsers().filter(
      		(u) => u.username !== r.user.username
    	  ),
  	]);

  	storage.setAuth({ username: r.user.username });

  	window.location.href = "/";
  	return;
	}
        setInfo("Compte non encore validé par l'administrateur.");
        return;
      }
    } catch (apiErr: any) {
      // 2) Fallback local (offline preview / no backend)
      if (apiErr?.status && apiErr.status >= 400 && apiErr.status < 500) {
        setError(apiErr.message); return;
      }
      setError(apiErr?.message || "Erreur API"); 
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--neon-pink)]/10 via-transparent to-[color:var(--neon-cyan)]/10 pointer-events-none" />
      <div className="relative w-full max-w-md glass rounded-2xl p-8 box-glow-green animate-rise">
        <div className="flex items-center gap-3 mb-6">
          <Logo size={36} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--neon-cyan)]">// INVITE ONLY</p>
            <h1 className="font-display text-2xl glow-green">SOUNDWAVE Access</h1>
          </div>
        </div>

        <div className="flex gap-2 mb-5 text-xs font-mono">
          <button
            onClick={() => { setMode("login"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 rounded-md border transition ${mode === "login" ? "bg-[color:var(--neon-green)]/15 border-[color:var(--neon-green)] text-[color:var(--neon-green)]" : "border-border hover:border-[color:var(--neon-green)]/50"}`}
            aria-pressed={mode === "login"}
          >
            <KeyRound className="size-3 inline mr-1" /> Connexion
          </button>
          <button
            onClick={() => { setMode("register"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 rounded-md border transition ${mode === "register" ? "bg-[color:var(--neon-pink)]/15 border-[color:var(--neon-pink)] text-[color:var(--neon-pink)]" : "border-border hover:border-[color:var(--neon-pink)]/50"}`}
            aria-pressed={mode === "register"}
          >
            <UserPlus className="size-3 inline mr-1" /> Demander un accès
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="u" className="block text-xs font-mono text-muted-foreground mb-1">Identifiant</label>
            <input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[color:var(--surface)]/60 border border-[color:var(--neon-cyan)]/30 focus:border-[color:var(--neon-cyan)] focus:outline-none focus:ring-2 focus:ring-[color:var(--neon-cyan)]/40 font-mono text-sm" />
          </div>
          <div>
            <label htmlFor="p" className="block text-xs font-mono text-muted-foreground mb-1">Mot de passe</label>
            <input id="p" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[color:var(--surface)]/60 border border-[color:var(--neon-cyan)]/30 focus:border-[color:var(--neon-cyan)] focus:outline-none focus:ring-2 focus:ring-[color:var(--neon-cyan)]/40 font-mono text-sm" />
          </div>

          {error && <p role="alert" className="text-xs text-[color:var(--neon-pink)] font-mono">{error}</p>}
          {info && <p role="status" className="text-xs text-[color:var(--neon-cyan)] font-mono flex items-start gap-1.5"><ShieldCheck className="size-3.5 mt-0.5" />{info}</p>}

          <button type="submit"
            className="w-full mt-2 py-2.5 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] font-medium hover:scale-[1.02] active:scale-100 transition box-glow-green">
            {mode === "login" ? "Entrer dans la grille" : "Créer le compte"}
          </button>
        </form>

        <p className="mt-6 text-[10px] font-mono text-muted-foreground text-center">
          Plateforme privée. Tous les nouveaux comptes nécessitent une validation manuelle par un administrateur.
        </p>
      </div>
    </div>
  );
}
