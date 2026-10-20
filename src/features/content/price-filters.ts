import type {PublicCatalog} from "./types";
export type PriceFilters = {search: string; vehicle: string; pickup: string; destination: string; sort: string};
export function filterPriceRoutes(routes: string[][], vehicles: PublicCatalog["vehicles"], filters: PriceFilters) {
  const names = new Map(vehicles.map(vehicle => [vehicle.id, vehicle.name]));
  const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = routes.filter(route => {
    const text = `${route[0]} ${route[1]} ${route[2]} ${names.get(route[6]) || ""}`.toLowerCase();
    return terms.every(term => text.includes(term)) && (!filters.vehicle || route[6] === filters.vehicle) && (!filters.pickup || route[0] === filters.pickup) && (!filters.destination || route[1] === filters.destination);
  });
  const price = (route: string[]) => route[4]?.trim() && Number.isFinite(Number(route[4])) ? Number(route[4]) : null;
  return filtered.sort((a, b) => {
    if (filters.sort === "price-asc" || filters.sort === "price-desc") {
      const first = price(a), second = price(b);
      if (first === null) return second === null ? 0 : 1;
      if (second === null) return -1;
      return filters.sort === "price-asc" ? first - second : second - first;
    }
    if (filters.sort === "route") return `${a[0]} ${a[1]}`.localeCompare(`${b[0]} ${b[1]}`);
    if (filters.sort === "vehicle") return (names.get(a[6]) || "").localeCompare(names.get(b[6]) || "");
    return 0;
  });
}
