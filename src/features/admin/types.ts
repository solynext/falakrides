export type AdminRow = { id: string; [key: string]: string };
export type Field = { key: string; label: string; type?: "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "select" | "checkbox"; options?: string[]; required?: boolean };
export type Module = { title: string; description: string; singular: string; icon: string; fields: Field[]; columns: string[]; rows: AdminRow[] };
