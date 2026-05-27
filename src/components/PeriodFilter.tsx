export type Period = "day" | "week" | "month" | "year" | "all";

const LABELS: Record<Period, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  all: "Tout",
};

const ORDER: Period[] = ["day", "week", "month", "year", "all"];

export function PeriodFilter({
  value, onChange, className = "",
}: { value: Period; onChange: (p: Period) => void; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-md border border-[color:var(--neon-cyan)]/20 bg-[color:var(--surface)]/30 ${className}`}>
      {ORDER.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition ${
              active
                ? "bg-[color:var(--neon-green)]/15 text-[color:var(--neon-green)] shadow-[0_0_10px_color-mix(in_oklab,var(--neon-green)_40%,transparent)]"
                : "text-muted-foreground hover:text-[color:var(--neon-cyan)]"
            }`}
          >
            {LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}

export default PeriodFilter;
