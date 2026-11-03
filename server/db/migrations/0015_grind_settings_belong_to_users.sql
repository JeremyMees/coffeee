ALTER TABLE "grindSetting" DROP CONSTRAINT "grindSettingShelfIdFk";
--> statement-breakpoint
ALTER TABLE "grindSetting" DROP CONSTRAINT "grindSettingUpdatedByFk";
--> statement-breakpoint
ALTER TABLE "grindSetting" DROP CONSTRAINT "grindSettingPk";
--> statement-breakpoint
ALTER TABLE "grindSetting" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" DROP COLUMN "shelfId";--> statement-breakpoint
ALTER TABLE "grindSetting" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingPk" PRIMARY KEY("userId","coffeeId","grinderId","brewMethodId");
