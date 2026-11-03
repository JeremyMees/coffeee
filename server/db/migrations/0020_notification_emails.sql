CREATE TABLE "notificationEmail" (
	"userId" text NOT NULL,
	"kind" "notificationKind" NOT NULL,
	CONSTRAINT "notificationEmailPk" PRIMARY KEY("userId","kind")
);
--> statement-breakpoint
ALTER TABLE "notificationEmail" ADD CONSTRAINT "notificationEmailUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;