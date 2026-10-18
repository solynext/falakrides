/** Build a CSV export URL without accepting arbitrary fetch destinations. */
export function customerSheetExportUrl(link: string): string {
  let url: URL;
  try {url = new URL(link.trim());} catch {throw new Error("Enter a valid Google Sheets link.");}
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.port || url.username || url.password) throw new Error("Use an https://docs.google.com/spreadsheets/ link.");
  const match = url.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/(e\/)?([\w-]+)(?:\/|$)/);
  if (!match) throw new Error("Enter a Google Sheets spreadsheet link.");
  const gid = url.searchParams.get("gid") ?? new URLSearchParams(url.hash.slice(1)).get("gid");
  if (gid !== null && !/^\d+$/.test(gid)) throw new Error("The sheet tab ID is invalid.");
  const target = new URL(match[1] ? `https://docs.google.com/spreadsheets/d/e/${match[2]}/pub` : `https://docs.google.com/spreadsheets/d/${match[2]}/export`);
  target.searchParams.set(match[1] ? "output" : "format", "csv");
  if (gid !== null) target.searchParams.set("gid", gid);
  if (match[1] && gid !== null) target.searchParams.set("single", "true");
  return target.toString();
}
