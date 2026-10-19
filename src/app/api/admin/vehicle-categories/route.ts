import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {body, failure, HttpError, json} from "@/lib/security/http";
import {z} from "zod";

const categoryName = z.string().trim().min(1,"Enter a category name.").max(80).regex(/^[^\u0000-\u001f\u007f]+$/, "Enter a valid category name.");
async function categoryAdmin() {
  const user = await requireAdmin("vehicles",true);
  if(user.role !== "Administrator") throw new HttpError(403,"Only administrators can manage vehicle categories.");
  return user;
}

export async function GET() {
  try {
    await requireAdmin("vehicles");
    return json({categories: await db.vehicleCategory.findMany({orderBy: {name: "asc"}})});
  } catch (error) {return failure(error);}
}

export async function POST(request:Request) {
  try {
    const user = await categoryAdmin();
    const {name} = z.object({name:categoryName}).parse(await body(request,2048));
    const category = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264102)::text`;
      if (await tx.vehicleCategory.findFirst({where:{name:{equals:name,mode:"insensitive"}}})) throw new HttpError(409,"This category already exists.");
      const created = await tx.vehicleCategory.create({data:{name}});
      await tx.auditLog.create({data:{userId:user.id,action:"create",resource:"vehicle-categories",recordId:created.id}});
      return created;
    });
    return json({category},201);
  } catch (error) {return failure(error);}
}

export async function PATCH(request:Request) {
  try {
    const user = await categoryAdmin();
    const input = z.object({id:z.string().min(1).max(100),name:categoryName,previousName:categoryName}).parse(await body(request,2048));
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264102)::text`;
      const existing = await tx.vehicleCategory.findUnique({where:{id:input.id}});
      if(!existing)throw new HttpError(404,"Category not found. Reload categories.");
      if(existing.name !== input.previousName)throw new HttpError(409,"This category has changed. Reload categories.");
      if(await tx.vehicleCategory.findFirst({where:{id:{not:input.id},name:{equals:input.name,mode:"insensitive"}}}))throw new HttpError(409,"This category already exists.");
      const category = await tx.vehicleCategory.update({where:{id:input.id},data:{name:input.name}});
      await tx.vehicle.updateMany({where:{category:existing.name},data:{category:input.name,version:{increment:1}}});
      const vehicles = await tx.vehicle.findMany({where:{category:input.name},select:{id:true,version:true}});
      await tx.auditLog.create({data:{userId:user.id,action:"rename",resource:"vehicle-categories",recordId:input.id}});
      return {category,vehicles};
    });
    return json(result);
  } catch(error) {return failure(error);}
}

export async function DELETE(request:Request) {
  try {
    const user = await categoryAdmin();
    const input = z.object({id:z.string().min(1).max(100),previousName:categoryName}).parse(await body(request,2048));
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7264102)::text`;
      const existing = await tx.vehicleCategory.findUnique({where:{id:input.id}});
      if(!existing)throw new HttpError(404,"Category not found. Reload categories.");
      if(existing.name !== input.previousName)throw new HttpError(409,"This category has changed. Reload categories.");
      const count = await tx.vehicle.count({where:{category:existing.name}});
      if(count)throw new HttpError(409,`This category is used by ${count} vehicle${count === 1 ? "" : "s"}. Reassign them before deleting it.`);
      await tx.vehicleCategory.delete({where:{id:input.id}});
      await tx.auditLog.create({data:{userId:user.id,action:"delete",resource:"vehicle-categories",recordId:input.id}});
    });
    return json({deleted:true});
  } catch(error) {return failure(error);}
}
