import type {AdminRow} from "./types";

export const bookingStatuses = ["Completed", "Confirmed", "Pending", "Cancelled", "Rejected", "Scheduled"] as const;
const statusColors = ["#8dc73f", "#8dc73f", "#e8bd64", "#f0f6e7", "#d49e8e", "#789cc7"];

/** Keep the status chart valid when the final record is removed. */
export function bookingGradient(rows: AdminRow[]): string {
  if (rows.length === 0) return "conic-gradient(#f0f6e7 0% 100%)";
  let end = 0;
  const stops = bookingStatuses.map((status, index) => {
    const start = end;
    end += rows.filter(row => row.status === status).length / rows.length * 100;
    return `${statusColors[index]} ${start}% ${end}%`;
  });
  stops.push(`#f0f6e7 ${end}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

/** Demo identifiers also work on a phone opening an HTTP LAN preview. */
export function createRecordId(prefix: string, existing: string[], randomUUID?: () => string): string {
  let suffix = "";
  try { suffix = randomUUID?.().replaceAll("-", "").slice(0, 8).toUpperCase() || ""; } catch { /* Use sequential demo IDs below. */ }
  if (suffix && !existing.includes(`${prefix}-${suffix}`)) return `${prefix}-${suffix}`;
  let number = 1;
  while (existing.includes(`${prefix}-${String(number).padStart(6, "0")}`)) number++;
  return `${prefix}-${String(number).padStart(6, "0")}`;
}
