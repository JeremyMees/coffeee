ALTER TABLE "grindSetting" ADD COLUMN "userId" text;--> statement-breakpoint
UPDATE "grindSetting" SET "userId" = coalesce("updatedBy", (SELECT "ownerId" FROM "shelf" WHERE "shelf"."id" = "grindSetting"."shelfId"));--> statement-breakpoint
DELETE FROM "grindSetting" AS "older" USING "grindSetting" AS "newer" WHERE "older"."userId" = "newer"."userId" AND "older"."coffeeId" = "newer"."coffeeId" AND "older"."grinderId" = "newer"."grinderId" AND "older"."brewMethodId" = "newer"."brewMethodId" AND ("older"."updatedAt", "older"."shelfId") < ("newer"."updatedAt", "newer"."shelfId");
