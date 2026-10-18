import {randomUUID} from "node:crypto";
import {hashPassword} from "better-auth/crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {body, digest, failure, HttpError, json, rateLimit} from "@/lib/security/http";
export async function POST(request: Request) {
  try {
    const input = z.object({token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(4).max(128)}).parse(await body(request, 4096));
    await rateLimit(request, "team-activate", 5, 600);
    const password = await hashPassword(input.password);
    await db.$transaction(async tx => {
      const invitation = await tx.verification.findFirst({where: {identifier: `invite:${digest(input.token)}`, expiresAt: {gt: new Date()}}});
      if (!invitation) throw new HttpError(400, "This invitation is invalid or expired.");
      const user = await tx.user.findUnique({where: {id: invitation.value}});
      if (!user || user.status !== "Invited") throw new HttpError(400, "This invitation is no longer available.");
      const consumed = await tx.verification.deleteMany({where: {id: invitation.id}});
      if (!consumed.count) throw new HttpError(409, "This invitation has already been used.");
      await tx.account.create({data: {id: randomUUID(), userId: user.id, providerId: "credential", accountId: user.id, password}});
      await tx.user.update({where: {id: user.id}, data: {status: "Active", version: {increment: 1}}});
    });
    return json({ok: true});
  } catch (error) {return failure(error);}
}
