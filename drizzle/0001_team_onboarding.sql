CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "firm_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "firm_invitation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_invited_by_auth_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_firm_time_idx" ON "firm_invitation" USING btree ("firm_id","created_at");
--> statement-breakpoint
ALTER TABLE "firm_membership" ADD COLUMN "revoked_at" timestamp with time zone;
