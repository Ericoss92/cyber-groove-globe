import { Volume2, Wind, Save, Check, AlertCircle } from "lucide-react";
import { CustomSlider } from "./CustomSlider";

interface Props {
  volume: number;        // 0..100
  crossfade: number;     // 0..10
  gapless: boolean;
  onVolumeChange: (v: number) => void;
  onCrossfadeChange: (v: number) => void;
  onGaplessChange: (v: boolean) => void;
  onSave: () => void | Promise<void>;
  saveState: "idle" | "saving" | "success" | "error";
  errorMsg?: string | null;
}

/**
 * AudioPreferencesBlock — shared neon block used in /profile and /settings.
 * Single source of truth for the audio prefs UI. Parent owns state + API I/O.
 */
export function AudioPreferencesBlock({
  volume, crossfade, gapless,
  onVolumeChange, onCrossfadeChange, onGaplessChange,
  onSave, saveState, errorMsg,
}: Props) {
  return (
    <section className="glass rounded-xl p-5 space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-lg glow-cyan">Préférences audio</h2>
        {saveState === "success" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[color:var(--neon-green)]">
            <Check className="size-3.5" /> sauvegardé
          </span>
        )}
        {saveState === "error" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[color:var(--neon-pink)]">
            <AlertCircle className="size-3.5" /> erreur
          </span>
        )}
      </header>

      <CustomSlider
        label="Volume"
        icon={<Volume2 size={16} />}
        value={volume} min={0} max={100} step={1}
        onChange={(v) => onVolumeChange(Math.round(v))}
        color="green"
        formatValue={(v) => `${Math.round(v)}%`}
      />

      <CustomSlider
        label="Crossfade"
        icon={<Wind size={16} />}
        value={crossfade} min={0} max={10} step={0.5}
        onChange={onCrossfadeChange}
        color="pink"
        formatValue={(v) => `${v.toFixed(1)}s`}
      />

      <label className="flex items-center gap-2 text-sm font-mono cursor-pointer select-none">
        <input
          type="checkbox"
          checked={gapless}
          onChange={(e) => onGaplessChange(e.target.checked)}
          className="accent-[color:var(--neon-cyan)]"
        />
        Lecture sans coupure (gapless)
      </label>

      {errorMsg && (
        <p className="text-xs font-mono text-[color:var(--neon-pink)]">// {errorMsg}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saveState === "saving"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[color:var(--neon-green)] text-[color:var(--background)] text-sm font-medium hover:scale-105 transition disabled:opacity-60"
        >
          <Save className="size-4" />
          {saveState === "saving" ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </section>
  );
}

export default AudioPreferencesBlock;
