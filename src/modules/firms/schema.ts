import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/modules/identity/schema";

export const memberRole = pgEnum("member_role", ["admin", "manager", "staff"]);
export const firm = pgTable("firm", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const membership = pgTable(
  "firm_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    role: memberRole("role").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("membership_firm_user_unique").on(table.firmId, table.userId),
    index("membership_user_idx").on(table.userId),
  ],
);

export const invitation = pgTable(
  "firm_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    deliveryStatus: text("delivery_status", {
      enum: ["pending", "submitted", "failed"],
    })
      .default("pending")
      .notNull(),
  },
  (table) => [
    index("invitation_firm_time_idx").on(table.firmId, table.createdAt),
  ],
);
