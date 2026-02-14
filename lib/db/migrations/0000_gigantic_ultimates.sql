CREATE TYPE "public"."category" AS ENUM('cozinha', 'pedro', 'ester', 'casa', 'pessoal', 'espiritual', 'compras');--> statement-breakpoint
CREATE TYPE "public"."completion_status" AS ENUM('done', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('MA', 'TA', 'NO');--> statement-breakpoint
CREATE TYPE "public"."person" AS ENUM('rubens', 'diene', 'juntos');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('daily', 'weekly', 'monthly', 'yearly', 'none');--> statement-breakpoint
CREATE TABLE "category_contingencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "category" NOT NULL,
	"plan_b" text NOT NULL,
	CONSTRAINT "category_contingencies_category_unique" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"period_start" boolean DEFAULT true NOT NULL,
	"period_end" boolean DEFAULT true NOT NULL,
	"daily_summary" boolean DEFAULT true NOT NULL,
	CONSTRAINT "notification_preferences_user_email_unique" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"actions" text[] NOT NULL,
	"color" text NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" "completion_status" NOT NULL,
	"user_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_completions_task_date_unique" UNIQUE("task_id","date")
);
--> statement-breakpoint
CREATE TABLE "task_recurrences" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"type" "recurrence_type" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"days_of_week" integer[],
	"day_of_month" integer,
	"month_of_year" integer,
	"week_of_month" integer,
	"periods" "period"[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"primary_person" "person" NOT NULL,
	"secondary_person" "person",
	"repetitions" text,
	"plan_b" text,
	"optional" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"protocol_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_steps" ADD CONSTRAINT "task_steps_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_email_idx" ON "push_subscriptions" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "task_completions_task_date_idx" ON "task_completions" USING btree ("task_id","date");--> statement-breakpoint
CREATE INDEX "task_completions_date_email_idx" ON "task_completions" USING btree ("date","user_email");--> statement-breakpoint
CREATE INDEX "task_recurrences_task_id_idx" ON "task_recurrences" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_steps_task_id_idx" ON "task_steps" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_category_idx" ON "tasks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tasks_primary_person_idx" ON "tasks" USING btree ("primary_person");