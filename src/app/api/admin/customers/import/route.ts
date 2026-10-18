import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {body, failure, HttpError, json} from "@/lib/security/http";
import {CUSTOMER_FILE_LIMIT, parseCustomerCsv} from "@/features/admin/customer-import";
import {fetchCustomerSheet} from "@/features/admin/customer-sheet-server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireAdmin("customers", true);
    const input = await body(request, CUSTOMER_FILE_LIMIT * 2);
    if (input?.link !== undefined && (typeof input.link !== "string" || input.link.length > 2048)) throw new HttpError(400, "Enter a valid Google Sheets link.");
    const csv = typeof input?.link === "string" ? await fetchCustomerSheet(input.link) : input?.csv;
    if (typeof csv !== "string" || Buffer.byteLength(csv, "utf8") > CUSTOMER_FILE_LIMIT) throw new HttpError(400, "Upload a CSV file up to 1 MB.");
    let customers;
    try {customers = parseCustomerCsv(csv);} catch (error) {throw new HttpError(400, error instanceof Error ? error.message : "Invalid spreadsheet.");}
    const result = await db.$transaction(async tx => {
      const created = await tx.customer.createMany({data: customers});
      await tx.auditLog.create({data: {userId: user.id, action: "import", resource: "customers", recordId: `csv:${created.count}`}});
      return {imported: created.count};
    }, {timeout: 20000});
    return json(result, 201);
  } catch (error) {return failure(error);}
}
