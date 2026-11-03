ALTER TABLE "invite" DROP CONSTRAINT "inviteEmailOrLink";--> statement-breakpoint
DROP INDEX "invitePendingEmailIdx";--> statement-breakpoint
ALTER TABLE "invite" ADD COLUMN "shelfId" text;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "inviteShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inviteShelfIdIdx" ON "invite" USING btree ("shelfId");--> statement-breakpoint
CREATE UNIQUE INDEX "invitePendingEmailIdx" ON "invite" USING btree ("email",coalesce("shelfId", '')) WHERE "invite"."usedAt" is null;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "inviteEmailOrLink" CHECK (("invite"."email" is not null or "invite"."tokenHash" is not null) and ("invite"."shelfId" is null or ("invite"."email" is not null and "invite"."tokenHash" is not null)));