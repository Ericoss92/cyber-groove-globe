// Minimal soundwave logo — pure SVG, no deps
export default function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="lg-sw" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--neon-green)" />
          <stop offset="1" stopColor="var(--neon-pink)" />
        </linearGradient>
      </defs>
      {/* concentric soundwave bars */}
      <g stroke="url(#lg-sw)" strokeLinecap="round" strokeWidth="2.5">
        <line x1="4"  y1="16" x2="4"  y2="16" />
        <line x1="9"  y1="11" x2="9"  y2="21" />
        <line x1="14" y1="6"  x2="14" y2="26" />
        <line x1="19" y1="10" x2="19" y2="22" />
        <line x1="24" y1="13" x2="24" y2="19" />
        <line x1="28" y1="15" x2="28" y2="17" />
      </g>
    </svg>
  );
}
