import {z} from "zod";
import {db} from "@/lib/db";
import {body, failure, json, rateLimit} from "@/lib/security/http";

export async function POST(request: Request) {
  try {
    const input = z.object({
      name: z.string().trim().min(1, "Enter your name.").max(80),
      rating: z.number().int().min(1, "Choose a rating from 1 to 5.").max(5),
      message: z.string().trim().min(1, "Write your review.").max(1500),
    }).strict().parse(await body(request, 10000));
    await rateLimit(request, "review", 5, 3600);
    await db.feedback.create({data: {
      customer: input.name, type: "Review", rating: input.rating,
      message: input.message, status: "Pending",
    }});
    return json({message: "Thank you! Your review has been submitted for approval."}, 201);
  } catch (error) {
    return failure(error);
  }
}
