CREATE TABLE "task_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"submitted_by" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"submitted_version" integer NOT NULL,
	"evidence" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"feedback" text,
	"decided_by" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "review_task_version_unique" UNIQUE("firm_id","task_id","submitted_version"),
	CONSTRAINT "review_independent_reviewer" CHECK ("task_review"."submitted_by" <> "task_review"."reviewer_id"),
	CONSTRAINT "review_decision_consistent" CHECK (("task_review"."outcome" = 'pending' AND "task_review"."decided_at" IS NULL AND "task_review"."decided_by" IS NULL) OR ("task_review"."outcome" <> 'pending' AND "task_review"."decided_at" IS NOT NULL AND "task_review"."decided_by" IS NOT NULL)),
	CONSTRAINT "review_outcome_valid" CHECK ("task_review"."outcome" IN ('pending', 'approved', 'changes_requested', 'withdrawn')),
	CONSTRAINT "review_feedback_required" CHECK ("task_review"."outcome" = 'pending' OR length(trim("task_review"."feedback")) >= 3 AND "task_review"."feedback" IS NOT NULL),
	CONSTRAINT "review_decision_by_reviewer" CHECK ("task_review"."outcome" NOT IN ('approved', 'changes_requested') OR "task_review"."decided_by" = "task_review"."reviewer_id")
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "storage_state" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_submitted_by_auth_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_reviewer_id_auth_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_decided_by_auth_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_firm_id_company_id_task_id_task_firm_id_company_id_id_fk" FOREIGN KEY ("firm_id","company_id","task_id") REFERENCES "public"."task"("firm_id","company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_firm_id_submitted_by_firm_membership_firm_id_user_id_fk" FOREIGN KEY ("firm_id","submitted_by") REFERENCES "public"."firm_membership"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_firm_id_reviewer_id_firm_membership_firm_id_user_id_fk" FOREIGN KEY ("firm_id","reviewer_id") REFERENCES "public"."firm_membership"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_review" ADD CONSTRAINT "task_review_firm_id_decided_by_firm_membership_firm_id_user_id_fk" FOREIGN KEY ("firm_id","decided_by") REFERENCES "public"."firm_membership"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_task_idx" ON "task_review" USING btree ("firm_id","task_id","submitted_version");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_storage_state_valid" CHECK ("document"."storage_state" IN ('pending', 'ready', 'failed'));--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "ready_document_requires_hash" CHECK ("document"."storage_state" <> 'ready' OR ("document"."sha256" IS NOT NULL AND "document"."sha256" ~ '^[a-f0-9]{64}$'));