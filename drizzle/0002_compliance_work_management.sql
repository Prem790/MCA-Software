CREATE TABLE "task_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "anchor_due_date" date;--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "occurrence_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation_template" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "obligation_template" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_checklist" ADD CONSTRAINT "task_checklist_firm_id_company_id_task_id_task_firm_id_company_id_id_fk" FOREIGN KEY ("firm_id","company_id","task_id") REFERENCES "public"."task"("firm_id","company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_author_id_auth_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_firm_id_company_id_task_id_task_firm_id_company_id_id_fk" FOREIGN KEY ("firm_id","company_id","task_id") REFERENCES "public"."task"("firm_id","company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_task_idx" ON "task_checklist" USING btree ("firm_id","task_id");--> statement-breakpoint
CREATE INDEX "comment_task_time_idx" ON "task_comment" USING btree ("firm_id","task_id","created_at");--> statement-breakpoint
ALTER TABLE "obligation" ADD CONSTRAINT "obligation_series_occurrence_unique" UNIQUE("firm_id","company_id","series_id","occurrence_number");