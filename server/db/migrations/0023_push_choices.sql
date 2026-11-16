CREATE TABLE "notificationPushOff" (
	"userId" text NOT NULL,
	"kind" "notificationKind" NOT NULL,
	CONSTRAINT "notificationPushOffPk" PRIMARY KEY("userId","kind")
);
--> statement-breakpoint
ALTER TABLE "notificationPushOff" ADD CONSTRAINT "notificationPushOffUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;