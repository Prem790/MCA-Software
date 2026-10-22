import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { firm } from "@/modules/firms/schema";

export const company = pgTable(
  "company",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    cin: text("cin"),
    companyType: text("company_type"),
    address: text("address"),
    contactEmail: text("contact_email"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("company_firm_id_unique").on(table.firmId, table.id),
    unique("company_firm_cin_unique").on(table.firmId, table.cin),
    index("company_firm_name_idx").on(table.firmId, table.name),
  ],
);

export const director = pgTable(
  "director",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    din: text("din"),
  },
  (table) => [
    unique("director_firm_id_unique").on(table.firmId, table.id),
    unique("director_firm_din_unique").on(table.firmId, table.din),
  ],
);

export const companyDirector = pgTable(
  "company_director",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    directorId: uuid("director_id").notNull(),
    designation: text("designation").notNull(),
  },
  (table) => [
    unique("company_director_unique").on(table.companyId, table.directorId),
    foreignKey({
      columns: [table.firmId, table.companyId],
      foreignColumns: [company.firmId, company.id],
    }),
    foreignKey({
      columns: [table.firmId, table.directorId],
      foreignColumns: [director.firmId, director.id],
    }),
    index("company_director_firm_idx").on(table.firmId),
  ],
);
