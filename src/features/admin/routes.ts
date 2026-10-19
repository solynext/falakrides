export const adminRoutes: Record<string, string> = {
  overview: "dashboard", bookings: "bookings", customers: "customers",
  drivers: "drivers", vehicles: "vehicles", fares: "price-and-routes",
  offers: "offers-and-packages", payments: "payments", feedback: "feedback",
  content: "website-content", reports: "reports", roles: "team-and-roles", settings: "settings",
  notifications: "notifications",
  locations: "locations",
};
export const adminLegacyRoutes: Record<string, string> = {
  fares:"fares", offers:"offers", reviews:"feedback", team:"roles",
  overview:"overview", content:"content", roles:"roles",
};
export const adminLegacyRedirect = (slug:string) => Object.hasOwn(adminLegacyRoutes,slug) ? adminSectionPath(adminLegacyRoutes[slug]) : undefined;
export const adminSectionPath = (section: string) => `/admin/${adminRoutes[section] || "dashboard"}`;
export const adminSectionFromPath = (pathname: string) => pathname === "/admin" || pathname === "/admin/" ? "overview" : Object.keys(adminRoutes).find(key => `/admin/${adminRoutes[key]}` === pathname.replace(/\/$/, ""));
