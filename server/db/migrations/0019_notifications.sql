CREATE TYPE "public"."notificationKind" AS ENUM('invited', 'coffeeAdded', 'purchaseAdded', 'bagFinished', 'memberJoined', 'memberLeft');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kind" "notificationKind" NOT NULL,
	"actorId" text,
	"shelfId" text NOT NULL,
	"coffeeId" text,
	"inviteId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationActorIdFk" FOREIGN KEY ("actorId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationInviteIdFk" FOREIGN KEY ("inviteId") REFERENCES "public"."invite"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificationUserIdCreatedAtIdx" ON "notification" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "notificationShelfIdIdx" ON "notification" USING btree ("shelfId");--> statement-breakpoint
CREATE INDEX "notificationCoffeeIdIdx" ON "notification" USING btree ("coffeeId");--> statement-breakpoint
CREATE INDEX "notificationInviteIdIdx" ON "notification" USING btree ("inviteId");