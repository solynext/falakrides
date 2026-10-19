const permissions: Record<string, {read: string[]; write: string[]}> = {
  Administrator: {read: ["*"], write: ["*"]},
  Dispatcher: {read: ["locations", "bookings", "customers", "drivers", "vehicles", "fares", "notifications", "feedback"], write: ["bookings", "customers", "drivers", "vehicles", "notifications"]},
  Finance: {read: ["bookings", "customers", "payments", "reports", "fares"], write: ["payments", "fares"]},
  Viewer: {read: ["locations", "bookings", "drivers", "vehicles", "fares", "offers", "feedback", "reports"], write: []},
};
export const canAccess = (role: string, resource: string, write = false) => {const allowed = permissions[role]?.[write ? "write" : "read"] || []; return allowed.includes("*") || allowed.includes(resource);};
