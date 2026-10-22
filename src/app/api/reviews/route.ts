import {z} from "zod";
import {db} from "@/lib/db";
import {body, failure, json, rateLimit} from "@/lib/security/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = z.object({
      name: z.string().trim().min(1, "Enter your name.").max(80),
      rating: z.number().int().min(1).max(5),
      journey: z.string().trim().max(150).default(""),
      message: z.string().trim().min(10, "Please write at least 10 characters.").max(1500),
    }).parse(await body(request, 10000));
    await rateLimit(request, "review", 5, 600);
    await db.feedback.create({data: {
      customer: input.name, rating: input.rating, journey: input.journey, message: input.message,
      type: "Review", status: "Pending", featured: false, isSample: false,
    }});
    return json({message: "Thank you! Your review has been sent to our team for approval."}, 201);
  } catch (error) {return failure(error);}
}
