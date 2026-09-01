CREATE TABLE "command_access" (
	"command" varchar(32) NOT NULL,
	"telegram_id" bigint NOT NULL,
	"granted_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_access_command_telegram_id_pk" PRIMARY KEY("command","telegram_id")
);
