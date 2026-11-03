ALTER TABLE "coffeeVerdict" ADD COLUMN "userId" text;--> statement-breakpoint
UPDATE "coffeeVerdict" SET "userId" = coalesce("updatedBy", (SELECT "ownerId" FROM "shelf" WHERE "shelf"."id" = "coffeeVerdict"."shelfId"));--> statement-breakpoint
DELETE FROM "coffeeVerdict" AS "older" USING "coffeeVerdict" AS "newer" WHERE "older"."userId" = "newer"."userId" AND "older"."coffeeId" = "newer"."coffeeId" AND ("older"."updatedAt", "older"."shelfId") < ("newer"."updatedAt", "newer"."shelfId");
