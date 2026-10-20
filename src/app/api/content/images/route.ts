import {requireAdmin} from "@/lib/auth";
import {getCloudinary, cloudinaryUploadFolder} from "@/lib/cloudinary";
import {failure, HttpError, json, rateLimit, sameOrigin} from "@/lib/security/http";
import {db} from "@/lib/db";
import {imageMimeType, MAX_CONTENT_IMAGE_BYTES} from "@/features/content/image-upload";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const requestedResource = new URL(request.url).searchParams.get("resource");
    const resource = requestedResource === "vehicles" || requestedResource === "locations" || requestedResource === "offers" || requestedResource === "services" ? requestedResource : "content";
    const user = await requireAdmin(resource, true);
    sameOrigin(request);
    await rateLimit(request,"content-image-uploads",20);
    if (Number(request.headers.get("content-length")) > MAX_CONTENT_IMAGE_BYTES) throw new HttpError(413,"Choose an image smaller than 8 MB.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400,"Choose an image to upload.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_CONTENT_IMAGE_BYTES) {await reader.cancel(); throw new HttpError(413,"Choose an image smaller than 8 MB.");}
      chunks.push(chunk.value);
    }
    const data = Buffer.concat(chunks);
    const mime = imageMimeType(data);
    if (!mime || request.headers.get("content-type")?.split(";")[0] !== mime) throw new HttpError(415,"Choose a valid JPEG, PNG, WebP, GIF, or AVIF image.");
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new HttpError(503,"Configure Cloudinary to upload website images.");
    const cloud = getCloudinary();
    const result = await new Promise<{secure_url:string;public_id:string;width:number;height:number}>((resolve,reject) => {
      cloud.uploader.upload_stream({folder:`${cloudinaryUploadFolder()}/${resource === "content" ? "website" : resource}`,resource_type:"image",allowed_formats:["jpg","png","webp","gif","avif"],overwrite:false},(error,result) => {
        if (error || !result) reject(new HttpError(502,"Image upload failed. Please try again."));
        else resolve(result);
      }).end(data);
    });
    await db.auditLog.create({data:{userId:user.id,action:"upload-image",resource,recordId:result.public_id}});
    return json({url:result.secure_url,publicId:result.public_id,width:result.width,height:result.height});
  } catch (error) {return failure(error);}
}
