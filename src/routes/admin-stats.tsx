import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BarChart3, Users, PlayCircle, Clock as ClockIcon } from "lucide-react";
import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { cachedUser } from "@/api/client";
import { useAdminStats } from "@/hooks/useAdminStats";

export const Route = createFileRoute("/admin-stats")({
  head: () => ({ meta: [{ title: "Analytics admin · SOUNDWAVE" }] }),
  component: AdminStatsPage,
});

const NEON = ["#39ff14", "#ff2bd6", "#00e5ff", "#ffd166", "#f72585", "#7b2cbf", "#4cc9f0", "#80ed99", "#ffafcc", "#bde0fe"];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const formatDateFR = (raw: string) => {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : dateFmt.format(d);
};

function NeonTooltip({ active, payload, label, accent = "#39ff14", unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 font-mono text-xs"
      style={{
        background: "rgba(10, 14, 39, 0.95)",
        border: `1px solid ${accent}`,
        color: accent,
        boxShadow: `0 0 12px ${accent}55`,
      }}
    >
      {label && <div className="text-foreground/90 mb-0.5">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i}>
          <span style={{ color: p.color || accent }}>● </span>
          {p.name}: <b>{p.value}</b>{unit && ` ${unit}`}
        </div>
      ))}
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent: string }) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3" style={{ boxShadow: `0 0 24px -10px ${accent}` }}>
      <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: `${accent}22`, color: accent }}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-2xl truncate">{value}</p>
      </div>
    </div>
  );
}

function AdminStatsPage() {
  const u = cachedUser.get();
  if (!u?.admin) return <Navigate to="/" />;
  const { data, loading, error, refresh } = useAdminStats();

  const dailyData = useMemo(
    () => (data?.dailyActiveUsers ?? []).map((d: any) => ({ ...d, date: formatDateFR(d.date) })),
    [data?.dailyActiveUsers],
  );


  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8 space-y-8">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-7 text-[color:var(--neon-cyan)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--neon-cyan)]">// ADMIN ANALYTICS</p>
            <h1 className="font-display text-3xl md:text-4xl glow-green">Statistiques globales</h1>
          </div>
        </div>
        <button onClick={refresh}
          className="px-3 py-1.5 rounded-md text-xs font-mono border border-[color:var(--neon-green)]/40 hover:bg-[color:var(--neon-green)]/10">
          ↻ Rafraîchir
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-[color:var(--neon-pink)]/40 bg-[color:var(--neon-pink)]/5 p-4 text-sm font-mono text-[color:var(--neon-pink)]">
          // {error}
        </div>
      )}

      {/* METRICS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard icon={Users} label="Utilisateurs" value={loading ? "…" : data?.totalUsers ?? 0} accent="#39ff14" />
        <StatsCard icon={PlayCircle} label="Actifs (30j)" value={loading ? "…" : data?.activeUsers ?? 0} accent="#00e5ff" />
        <StatsCard icon={ClockIcon} label="Nouveaux (7j)" value={loading ? "…" : data?.newUsersThisWeek ?? 0} accent="#ffd166" />
        <StatsCard icon={Users} label="En attente" value={loading ? "…" : data?.pendingApprovals ?? 0} accent="#ff2bd6" />
      </section>

      {/* CHARTS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <h3 className="font-display text-lg mb-3 glow-cyan">Utilisateurs actifs par jour (30j)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip content={<NeonTooltip accent="#39ff14" unit="utilisateurs" />} cursor={{ stroke: "#39ff1444" }} />
                <Line type="monotone" dataKey="count" stroke="#39ff14" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="font-display text-lg mb-3 glow-pink">Top 10 artistes</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.topArtistsGlobal ?? []} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#e5e7eb" }} width={100} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #ff2bd6", fontSize: 12 }} />
                <Bar dataKey="count" fill="#ff2bd6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="font-display text-lg mb-3 glow-green">Top genres</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data?.topGenresGlobal ?? []} dataKey="count" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}>
                  {(data?.topGenresGlobal ?? []).map((_, i) => <Cell key={i} fill={NEON[i % NEON.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #39ff14", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="font-display text-lg mb-3 glow-cyan">Top pays</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.topCountriesGlobal ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #00e5ff", fontSize: 12 }} />
                <Bar dataKey="count" fill="#00e5ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
