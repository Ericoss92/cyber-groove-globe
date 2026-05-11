// SSR-safe number formatting (avoids hydration mismatch from toLocaleString)
export function formatNumber(n: number): string {
  // group by 3 with non-breaking thin space, deterministic across server/client
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}
