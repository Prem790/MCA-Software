import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

// Both node-postgres and the isolated PostgreSQL test adapter implement this query surface.
import type * as schema from "./schema";
export type QueryDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;
