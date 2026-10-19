import {requireAdmin} from "@/lib/auth";
import {db} from "@/lib/db";
import {body,failure,HttpError,json,rateLimit} from "@/lib/security/http";
import {writeRecord} from "@/features/admin/server";
import {deliverNotification,notificationConfigured} from "@/features/admin/notifications";
import {bookingStatusMessage} from "@/features/bookings/status-message";
import {z} from "zod";

export async function POST(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const user=await requireAdmin("bookings",true);
    await requireAdmin("notifications",true);
    const input=z.object({channel:z.enum(["Email","WhatsApp"]),row:z.record(z.string(),z.string())}).parse(await body(request));
    await rateLimit(request,"booking-status-send",20);
    const {id}=await context.params;
    if(input.row.id && input.row.id !== id)throw new HttpError(400,"The booking details do not match the selected booking. Reload and try again.");
    const existing=await db.booking.findUnique({where:{reference:id}});
    if(!existing)throw new HttpError(404,"Booking not found.");
    const requestedRecipient=input.channel === "Email" ? (input.row.email ?? existing.customerEmail).trim() : (input.row.phone ?? existing.phone).replace(/[\s()-]/g,"");
    if(input.channel === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedRecipient))throw new HttpError(400,"Enter the customer's email address before sending.");
    if(input.channel === "WhatsApp" && !/^\+\d{8,15}$/.test(requestedRecipient))throw new HttpError(400,"Enter an international WhatsApp number, including + and country code.");
    if(input.channel === "Email" && !notificationConfigured("Email"))throw new HttpError(503,"Email delivery is not configured.");
    const saved=await writeRecord("bookings",input.row,user,id,{notifyConfirmation:false});
    const row=saved.row;
    const booking=await db.booking.findUniqueOrThrow({where:{reference:id}});
    if(String(booking.version) !== row._version) return json({row,deliveryError:"The booking changed again. Review the latest details before sending."});
    const recipient=input.channel === "Email" ? booking.customerEmail.trim() : booking.phone.replace(/[\s()-]/g,"");
    if(recipient !== requestedRecipient)return json({row,deliveryError:"The customer's contact details changed. Review them before sending."});
    const message=bookingStatusMessage(booking);
    if(input.channel === "WhatsApp" && !notificationConfigured("WhatsApp")) {
      await db.auditLog.create({data:{userId:user.id,action:"prepare-whatsapp",resource:"bookings",recordId:booking.id}});
      return json({row,whatsappUrl:`https://wa.me/${recipient.slice(1)}?text=${encodeURIComponent(message)}`});
    }
    try {
      const notification=await db.notification.create({data:{bookingId:booking.id,recipient,channel:input.channel,status:"Queued",message}});
      await deliverNotification(notification.id);
      await db.auditLog.create({data:{userId:user.id,action:"send-status",resource:"bookings",recordId:booking.id}});
      return json({row,sent:true,sentTo:recipient});
    } catch(error) {return json({row,deliveryError:error instanceof Error ? error.message : "Message delivery failed. Your booking changes were saved."});}
  } catch(error) {return failure(error);}
}
