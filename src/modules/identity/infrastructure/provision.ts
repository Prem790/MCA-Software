import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { QueryDatabase } from "@/platform/database/types";
import { user, account } from "../schema";
import { firm, membership } from "@/modules/firms/schema";
import { appendAudit } from "@/modules/audit";

export const provisioningInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
    firmName: z.string().trim().min(2).max(200).optional(),
    firmId: z.uuid().optional(),
    role: z.enum(["admin", "manager", "staff"]).default("admin"),
  })
  .superRefine((value, ctx) => {
    if (!!value.firmId === !!value.firmName)
      ctx.addIssue({
        code: "custom",
        message: "Provide exactly one firm ID or new firm name",
      });
    if (value.firmName && value.role !== "admin")
      ctx.addIssue({
        code: "custom",
        message: "A new firm requires an administrator",
      });
  });

// Operator-only bootstrap. There is deliberately no public signup/provisioning route.
export async function provisionAccount(db: QueryDatabase, input: unknown) {
  const parsed = provisioningInput.parse(input);
  const passwordHash = await hashPassword(parsed.password);
  return db.transaction(async (tx) => {
    const firmId = parsed.firmId ?? randomUUID();
    if (parsed.firmId) {
      const [existing] = await tx
        .select({ id: firm.id })
        .from(firm)
        .where(eq(firm.id, firmId));
      if (!existing) throw new Error("Target firm was not found");
    } else {
      await tx.insert(firm).values({ id: firmId, name: parsed.firmName! });
    }
    const userId = randomUUID();
    await tx.insert(user).values({
      id: userId,
      name: parsed.name,
      email: parsed.email,
      emailVerified: false,
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await tx.insert(membership).values({ firmId, userId, role: parsed.role });
    await appendAudit(tx, {
      firmId,
      actorId: userId,
      action: "identity.provisioned",
      resourceType: "user",
      resourceId: userId,
      requestId: randomUUID(),
    });
    return { userId, firmId };
  });
}
