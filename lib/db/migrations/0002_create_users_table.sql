CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
INSERT INTO "users" ("email", "name", "password_hash") VALUES
  ('rubens.miguek@gmail.com', 'Rubens', '$2b$10$AE5Xdo9KPgAYmmwXh/fE4.H9BFEe.VEpB1Qu7KRg6diIwSFARNhuO'),
  ('diene12374@gmail.com', 'Diene', '$2b$10$AE5Xdo9KPgAYmmwXh/fE4.H9BFEe.VEpB1Qu7KRg6diIwSFARNhuO');
