CREATE TABLE "pre_schedule_cache" (
	"group_api_id" varchar(64) PRIMARY KEY NOT NULL,
	"raw_data_hash" varchar(64) NOT NULL,
	"parsed_data" jsonb NOT NULL,
	"teacher_source_data" jsonb NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_cache" (
	"group_api_id" varchar(64) PRIMARY KEY NOT NULL,
	"raw_data_hash" varchar(64) NOT NULL,
	"parsed_data" jsonb NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"group_api_id" varchar(64),
	"reminder_offset" integer DEFAULT 5,
	"schedule_format" varchar(16) DEFAULT 'detailed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
