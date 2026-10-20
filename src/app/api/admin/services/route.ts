import {requireAdmin} from "@/lib/auth";
import {body, failure, json} from "@/lib/security/http";
import {readServicesForAdmin, saveServices} from "@/features/services/server";
import {z} from "zod";

export const runtime="nodejs";
export async function GET() {
  try {await requireAdmin("services");return json(await readServicesForAdmin());}catch(error){return failure(error);}
}
export async function PUT(request:Request) {
  try {
    const user=await requireAdmin("services",true);
    const input=z.object({version:z.number().int().nonnegative(),services:z.array(z.unknown()).max(60),locationAssignments:z.record(z.string(),z.array(z.string()).max(1000)).optional()}).parse(await body(request));
    await saveServices(input.version,input.services,user.id,input.locationAssignments);
    return json(await readServicesForAdmin());
  }catch(error){return failure(error);}
}
