/**
 * Formats seconds (float) as "M:SS.mmm" without zero-padded minutes.
 * Minutes grow unbounded (e.g. 65:00.000 for 3900s). No hours component.
 */
export function formatSecondsForInput(s: number): string {
  const totalMs = Math.round(s * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${min}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

/**
 * Parses "M:SS.mmm" or "MM:SS.mmm" into float seconds.
 * Throws on invalid format or out-of-range values.
 */
export function parseTimeString(s: string): number {
  const match = /^(\d+):(\d{2})(?:\.(\d{1,3}))?$/.exec(s.trim());
  if (!match) throw new Error(`Invalid time format: "${s}"`);
  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  if (sec >= 60) throw new Error(`Seconds out of range in: "${s}"`);
  const msRaw = match[3] ?? "0";
  const ms = parseInt(msRaw.padEnd(3, "0"), 10);
  return min * 60 + sec + ms / 1000;
}
