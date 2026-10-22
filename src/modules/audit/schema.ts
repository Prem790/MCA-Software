import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { firm } from "@/modules/firms/schema";
import { user } from "@/modules/identity/schema";

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id),
    actorId: text("actor_id").references(() => user.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    requestId: text("request_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("audit_firm_time_idx").on(table.firmId, table.occurredAt)],
);
