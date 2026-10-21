import type {PublicCatalog} from "@/features/content/types";

function endpoint(value: string) {
  const name = value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const aliases: Record<string, string> = {mecca: "makkah", medina: "madinah", "king abdulaziz international airport": "jeddah airport"};
  return aliases[name] ?? name;
}

export function matchingRouteFares(catalog: PublicCatalog | undefined, from: string, to: string) {
  return (catalog?.fares ?? []).filter(item => {
    // Older imports used a misencoded arrow; accept it alongside the current separator.
    const parts = item.route.split(/\s*(?:\u2192|\u00e2\u2020\u2019|\u00c3\u00a2\u00e2\u20ac\u00a0\u00e2\u20ac\u2122|->)\s*/);
    return parts.length === 2 && endpoint(parts[0]) === endpoint(from) && endpoint(parts[1]) === endpoint(to) &&
      (!item.vehicleId || catalog?.vehicles.some(vehicle => vehicle.id === item.vehicleId));
  });
}

export function fareLabel(fare: number | null, maxFare?: number | null) {
  if (fare === null || !Number.isFinite(fare) || fare <= 0) return "Contact us for a quote";
  const amount = (value: number) => `SAR ${value.toLocaleString("en-SA", {maximumFractionDigits: 2})}`;
  if (maxFare != null && Number.isFinite(maxFare) && maxFare > fare) return `${amount(fare)}–${amount(maxFare)}`;
  return amount(fare);
}
