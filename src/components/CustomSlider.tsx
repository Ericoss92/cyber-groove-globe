import { useId, type ReactNode } from "react";

type Color = "green" | "pink" | "cyan" | "gold";

interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  color?: Color;
  icon?: ReactNode;
  showValue?: boolean;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
  className?: string;
}

/**
 * CustomSlider — futuristic neon range input.
 * Uses a real <input type="range"> for accessibility + keyboard support,
 * styled with a custom track + thumb that glow in the chosen neon color.
 */
export function CustomSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  color = "green",
  icon,
  showValue = true,
  formatValue,
  ariaLabel,
  className = "",
}: CustomSliderProps) {
  const id = useId();
  const safeMax = max <= min ? min + 1 : max;
  const pct = Math.max(0, Math.min(100, ((value - min) / (safeMax - min)) * 100));
  const neon = `var(--neon-${color})`;

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      {icon && <span className="shrink-0 text-[color:var(--neon-cyan)]">{icon}</span>}
      {label && (
        <label htmlFor={id} className="shrink-0 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative flex-1 h-6 flex items-center group">
        {/* Track */}
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ease-linear"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${neon}, color-mix(in oklab, ${neon} 70%, white))`,
              boxShadow: `0 0 10px ${neon}`,
            }}
          />
        </div>
        {/* Thumb (visual) */}
        <div
          aria-hidden
          className="absolute size-3.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition"
          style={{
            left: `calc(${pct}% - 7px)`,
            background: neon,
            boxShadow: `0 0 12px ${neon}, 0 0 4px ${neon}`,
            border: "2px solid var(--background)",
          }}
        />
        {/* Native input — transparent, on top, fully accessible */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={ariaLabel ?? label}
          className="absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
      </div>
      {showValue && (
        <span
          className="shrink-0 text-[11px] font-mono tabular-nums min-w-[2.5rem] text-right"
          style={{ color: neon }}
        >
          {formatValue ? formatValue(value) : value.toFixed(step < 1 ? 1 : 0)}
        </span>
      )}
    </div>
  );
}

export default CustomSlider;
