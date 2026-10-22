CREATE TYPE "public"."member_role" AS ENUM('admin', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'waiting_for_documents', 'submitted_for_review', 'changes_requested', 'approved', 'completed');--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_firm_user_unique" UNIQUE("firm_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cin" text,
	"company_type" text,
	"address" text,
	"contact_email" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_firm_id_unique" UNIQUE("firm_id","id"),
	CONSTRAINT "company_firm_cin_unique" UNIQUE("firm_id","cin")
);
--> statement-breakpoint
CREATE TABLE "company_director" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"director_id" uuid NOT NULL,
	"designation" text NOT NULL,
	CONSTRAINT "company_director_unique" UNIQUE("company_id","director_id")
);
--> statement-breakpoint
CREATE TABLE "director" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"din" text,
	CONSTRAINT "director_firm_id_unique" UNIQUE("firm_id","id"),
	CONSTRAINT "director_firm_din_unique" UNIQUE("firm_id","din")
);
--> statement-breakpoint
CREATE TABLE "obligation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"template_id" uuid,
	"title" text NOT NULL,
	"reporting_period" text NOT NULL,
	"due_date" date NOT NULL,
	"due_date_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obligation_firm_company_id_unique" UNIQUE("firm_id","company_id","id")
);
--> statement-breakpoint
CREATE TABLE "obligation_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "template_firm_id_unique" UNIQUE("firm_id","id")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"obligation_id" uuid,
	"title" text NOT NULL,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"assignee_id" text,
	"due_date" date NOT NULL,
	"completion_evidence" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_firm_company_id_unique" UNIQUE("firm_id","company_id","id"),
	CONSTRAINT "completed_task_requires_evidence" CHECK ("task"."status" <> 'completed' OR ("task"."completed_at" IS NOT NULL AND length(trim("task"."completion_evidence")) > 0 AND "task"."completion_evidence" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"task_id" uuid,
	"uploaded_by" text NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "document_positive_size" CHECK ("document"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"request_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_membership" ADD CONSTRAINT "firm_membership_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_membership" ADD CONSTRAINT "firm_membership_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_director" ADD CONSTRAINT "company_director_firm_id_company_id_company_firm_id_id_fk" FOREIGN KEY ("firm_id","company_id") REFERENCES "public"."company"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_director" ADD CONSTRAINT "company_director_firm_id_director_id_director_firm_id_id_fk" FOREIGN KEY ("firm_id","director_id") REFERENCES "public"."director"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "director" ADD CONSTRAINT "director_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation" ADD CONSTRAINT "obligation_firm_id_company_id_company_firm_id_id_fk" FOREIGN KEY ("firm_id","company_id") REFERENCES "public"."company"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation" ADD CONSTRAINT "obligation_firm_id_template_id_obligation_template_firm_id_id_fk" FOREIGN KEY ("firm_id","template_id") REFERENCES "public"."obligation_template"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_template" ADD CONSTRAINT "obligation_template_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_firm_id_company_id_company_firm_id_id_fk" FOREIGN KEY ("firm_id","company_id") REFERENCES "public"."company"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_firm_id_company_id_obligation_id_obligation_firm_id_company_id_id_fk" FOREIGN KEY ("firm_id","company_id","obligation_id") REFERENCES "public"."obligation"("firm_id","company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_firm_id_assignee_id_firm_membership_firm_id_user_id_fk" FOREIGN KEY ("firm_id","assignee_id") REFERENCES "public"."firm_membership"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_firm_id_company_id_company_firm_id_id_fk" FOREIGN KEY ("firm_id","company_id") REFERENCES "public"."company"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_firm_id_company_id_task_id_task_firm_id_company_id_id_fk" FOREIGN KEY ("firm_id","company_id","task_id") REFERENCES "public"."task"("firm_id","company_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_firm_id_uploaded_by_firm_membership_firm_id_user_id_fk" FOREIGN KEY ("firm_id","uploaded_by") REFERENCES "public"."firm_membership"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_firm_id_firm_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "firm_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_firm_name_idx" ON "company" USING btree ("firm_id","name");--> statement-breakpoint
CREATE INDEX "company_director_firm_idx" ON "company_director" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "obligation_firm_due_idx" ON "obligation" USING btree ("firm_id","due_date");--> statement-breakpoint
CREATE INDEX "task_firm_status_due_idx" ON "task" USING btree ("firm_id","status","due_date");--> statement-breakpoint
CREATE INDEX "task_assignee_idx" ON "task" USING btree ("firm_id","assignee_id");--> statement-breakpoint
CREATE INDEX "document_firm_company_idx" ON "document" USING btree ("firm_id","company_id");--> statement-breakpoint
CREATE INDEX "audit_firm_time_idx" ON "audit_event" USING btree ("firm_id","occurred_at");