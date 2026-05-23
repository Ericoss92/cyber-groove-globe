import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Search, Library, ListMusic, Heart, Clock, Settings as SettingsIcon, LogOut, ShieldCheck, Compass, User, BarChart3 } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import Logo from "./Logo";
import { storage } from "@/lib/storage";
import { api, cachedUser, tokens } from "@/api/client";

const PRIMARY = [
  { title: "Accueil",       url: "/",          icon: Home },
  { title: "Découverte",    url: "/discover",  icon: Compass },
  { title: "Recherche",     url: "/search",    icon: Search },
  { title: "Bibliothèque",  url: "/favorites", icon: Library },
];

const LIBRARY = [
  { title: "Playlists", url: "/playlists", icon: ListMusic },
  { title: "Favoris",   url: "/favorites", icon: Heart },
  { title: "Récents",   url: "/recent",    icon: Clock },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const isActive = (path: string) => pathname === path;
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!cachedUser.get()?.admin);
  useEffect(() => {
    if (!tokens.access) { setIsAdmin(false); return; }
    api.me().then(u => setIsAdmin(!!u.admin)).catch(() => setIsAdmin(!!cachedUser.get()?.admin));
  }, []);
  async function doLogout() {
    try { await api.logout(); } catch {}
    storage.logout();
    navigate({ to: "/login" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-[color:var(--neon-green)]/20">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Accueil SOUNDWAVE">
          <Logo size={28} className="shrink-0 group-hover:scale-110 transition" />
          {!collapsed && (
            <span className="font-display font-extrabold text-lg tracking-[0.18em] glow-green">
              SOUND<span className="text-[color:var(--neon-pink)] glow-pink">WAVE</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="font-mono text-[10px] tracking-widest text-[color:var(--neon-cyan)]">// NAVIGATION</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                    <Link to={it.url} aria-label={it.title} className="focus-visible:ring-2 focus-visible:ring-[color:var(--neon-green)] focus-visible:outline-none">
                      <it.icon className="size-4" />
                      {!collapsed && <span>{it.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="font-mono text-[10px] tracking-widest text-[color:var(--neon-pink)]">// LIBRARY</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {LIBRARY.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                    <Link to={it.url} aria-label={it.title} className="focus-visible:ring-2 focus-visible:ring-[color:var(--neon-green)] focus-visible:outline-none">
                      <it.icon className="size-4" />
                      {!collapsed && <span>{it.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[color:var(--neon-green)]/15 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip="Profil">
              <Link to="/profile" aria-label="Profil">
                <User className="size-4" />
                {!collapsed && <span>Profil</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Paramètres">
              <Link to="/settings" aria-label="Paramètres">
                <SettingsIcon className="size-4" />
                {!collapsed && <span>Paramètres</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin-approval")} tooltip="Admin">
                  <Link to="/admin-approval" aria-label="Admin">
                    <ShieldCheck className="size-4" />
                    {!collapsed && <span>Admin</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin-stats")} tooltip="Analytics">
                  <Link to="/admin-stats" aria-label="Analytics">
                    <BarChart3 className="size-4" />
                    {!collapsed && <span>Analytics</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Déconnexion"
              onClick={doLogout}
              aria-label="Se déconnecter"
            >
              <LogOut className="size-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
