import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import Header from "@/components/Header";
import PlayerBar from "@/components/PlayerBar";
import { PlayerProvider } from "@/lib/player";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold glow-pink">404</h1>
        <h2 className="mt-4 text-xl">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette transmission est perdue dans l'éther.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-[color:var(--neon-green)] px-4 py-2 text-sm font-medium text-[color:var(--background)] hover:scale-105 transition">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold glow-pink">Une erreur s'est produite</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-[color:var(--neon-green)] px-4 py-2 text-sm font-medium text-[color:var(--background)]">
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SOUNDWAVE — Plateforme musicale cyberpunk" },
      { name: "description", content: "Explorez la musique du monde entier sur un globe 3D interactif. Artistes, playlists, lecteur audio cyberpunk." },
      { name: "author", content: "SOUNDWAVE" },
      { property: "og:title", content: "SOUNDWAVE — Plateforme musicale cyberpunk" },
      { property: "og:description", content: "Explorez la musique du monde entier sur un globe 3D interactif." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pb-28">
            <Outlet />
          </main>
          <PlayerBar />
        </div>
      </PlayerProvider>
    </QueryClientProvider>
  );
}
