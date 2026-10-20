"use client";
import {useState} from "react";
import {useSiteCatalog} from "@/features/content/public-content";
import {filterPriceRoutes, type PriceFilters} from "@/features/content/price-filters";
import PriceRouteCard from "./price-route-card";
import "./price-route-cards.css";
import "./price-route-list.css";
const initial: PriceFilters = {search:"", vehicle:"", pickup:"", destination:"", sort:"default"};
export default function PriceRouteList() {
  const {routes, vehicles} = useSiteCatalog();
  const [filters, setFilters] = useState(initial);
  const results = filterPriceRoutes(routes, vehicles, filters);
  const update = (key: keyof PriceFilters, value: string) => setFilters(current => ({...current, [key]:value}));
  const options = (index: number) => [...new Set(routes.map(route => route[index]).filter(Boolean))].sort();
  const vehicleOptions = vehicles.filter(vehicle => vehicle.id && routes.some(route => route[6] === vehicle.id));
  return <section className="taxi-price-list" aria-label="All prices and routes">
    <div className="taxi-price-filters">
      <label>Vehicle<select value={filters.vehicle} onChange={event => update("vehicle", event.target.value)}><option value="">All vehicles</option>{vehicleOptions.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></label>
      <label>Pickup<select value={filters.pickup} onChange={event => update("pickup", event.target.value)}><option value="">All pickups</option>{options(0).map(place => <option key={place}>{place}</option>)}</select></label>
      <label>Destination<select value={filters.destination} onChange={event => update("destination", event.target.value)}><option value="">All destinations</option>{options(1).map(place => <option key={place}>{place}</option>)}</select></label>
      <label>Sort by<select value={filters.sort} onChange={event => update("sort", event.target.value)}><option value="default">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="route">Route: A to Z</option><option value="vehicle">Vehicle: A to Z</option></select></label>
    </div>
    <div className="taxi-price-results"><p role="status">Showing {results.length} of {routes.length} rides</p><button type="button" onClick={() => setFilters(initial)}>Reset filters</button></div>
    {results.length ? <div className="taxi-price-list-grid">{results.map(route => <PriceRouteCard key={route[7] || `${route[0]}:${route[1]}:${route[6]}`} route={route} vehicle={vehicles.find(vehicle => vehicle.id === route[6])}/>)}</div> : <div className="taxi-price-empty"><h3>No matching rides</h3><p>Adjust or reset your filters to see all available prices.</p></div>}
  </section>;
}
