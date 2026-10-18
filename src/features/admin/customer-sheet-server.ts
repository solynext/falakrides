import {CUSTOMER_FILE_LIMIT} from "./customer-import";
import {customerSheetExportUrl} from "./customer-sheet-link";
import {HttpError} from "@/lib/security/http";

export async function fetchCustomerSheet(link: string): Promise<string> {
  let target: string;
  try {target = customerSheetExportUrl(link);} catch (error) {throw new HttpError(400, error instanceof Error ? error.message : "Invalid Google Sheets link.");}
  const signal = AbortSignal.timeout(15000);
  try {
    for (let redirects = 0; redirects <= 4; redirects++) {
      const response = await fetch(target, {redirect: "manual", cache: "no-store", signal, headers: {Accept: "text/csv"}});
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) break;
        const next = new URL(location, target);
        if (next.protocol !== "https:" || next.port || next.username || next.password || !(next.hostname === "docs.google.com" || next.hostname.endsWith(".googleusercontent.com"))) break;
        target = next.toString();
        continue;
      }
      if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {await response.body?.cancel(); break;}
      const reader = response.body?.getReader();
      if (!reader) break;
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > CUSTOMER_FILE_LIMIT) {await reader.cancel(); throw new HttpError(413, "The sheet is too large. Import up to 1 MB at a time.");}
        chunks.push(chunk.value);
      }
      return Buffer.concat(chunks).toString("utf8");
    }
    throw new HttpError(400, "Cannot read this sheet. Set sharing to Anyone with the link (Viewer), or use a published sheet link.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Could not download the Google Sheet. Check the link and sharing settings, then try again.");
  }
}
