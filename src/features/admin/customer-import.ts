export type ImportedCustomer = {name: string; email: string; phone: string; notes: string};
export const CUSTOMER_IMPORT_LIMIT = 500;
export const CUSTOMER_FILE_LIMIT = 1024 * 1024;

/** Parse RFC-style CSV, including escaped quotes and multiline spreadsheet cells. */
export function parseCustomerCsv(input: string): ImportedCustomer[] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  function pushCell() {row.push(cell); cell = ""; closed = false;}
  function pushRow() {pushCell(); if (row.some(value => value.trim())) rows.push(row); row = []; if (rows.length > CUSTOMER_IMPORT_LIMIT + 1) throw new Error(`Import at most ${CUSTOMER_IMPORT_LIMIT} customers at a time.`);}
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {if (text[i + 1] === '"') {cell += '"'; i++;} else {quoted = false; closed = true;}} else cell += char;
    } else if (char === ",") pushCell();
    else if (char === "\n" || char === "\r") {if (char === "\r" && text[i + 1] === "\n") i++; pushRow();}
    else if (char === '"' && !cell && !closed) quoted = true;
    else {if (closed || char === '"') throw new Error("Invalid CSV quoting. Export the sheet as CSV and try again."); cell += char;}
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted cell.");
  if (cell || row.length || closed) pushRow();
  const headers = rows.shift()?.map(value => value.trim().toLowerCase()) ?? [];
  if (!headers.includes("name")) throw new Error('The first row must include a "name" column. Optional columns: email, phone, notes.');
  if (new Set(headers).size !== headers.length) throw new Error("Column headings must be unique.");
  if (!rows.length) throw new Error("The spreadsheet contains no customers.");
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Data row ${index + 1}: the number of cells does not match the headings.`);
    const get = (key: string) => (values[headers.indexOf(key)] ?? "").trim();
    const customer = {name: get("name"), email: get("email").toLowerCase(), phone: get("phone"), notes: get("notes") || get("preferences")};
    for (const value of Object.values(customer)) if (value.length > 1500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error(`Data row ${index + 1}: a cell is too long or contains invalid characters.`);
    if (!customer.name) throw new Error(`Data row ${index + 1}: name is required.`);
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error(`Data row ${index + 1}: enter a valid email.`);
    if (customer.phone && (!/^\+?[\d\s()-]+$/.test(customer.phone) || !/^[\d]{8,15}$/.test(customer.phone.replace(/\D/g, "")))) throw new Error(`Data row ${index + 1}: enter a valid phone number with 8–15 digits.`);
    return customer;
  });
}
