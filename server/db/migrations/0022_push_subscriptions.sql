CREATE TABLE "pushSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pushSubscriptionEndpointUnique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "pushSubscription" ADD CONSTRAINT "pushSubscriptionUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pushSubscriptionUserIdIdx" ON "pushSubscription" USING btree ("userId");