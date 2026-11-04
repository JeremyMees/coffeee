ALTER TABLE "coffee" DROP CONSTRAINT "coffeeRoasterIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeFlavorNote" DROP CONSTRAINT "coffeeFlavorNoteCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "grindSetting" DROP CONSTRAINT "grindSettingCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "shelfGrinder" DROP CONSTRAINT "shelfGrinderShelfIdFk";
--> statement-breakpoint
ALTER TABLE "invite" DROP CONSTRAINT "inviteShelfIdFk";
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notificationShelfIdFk";
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notificationCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeFarm" DROP CONSTRAINT "coffeeFarmCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeOrigin" DROP CONSTRAINT "coffeeOriginCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeRegion" DROP CONSTRAINT "coffeeRegionCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeWashingStation" DROP CONSTRAINT "coffeeWashingStationCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeProcess" DROP CONSTRAINT "coffeeProcessCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeProducer" DROP CONSTRAINT "coffeeProducerCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "purchase" DROP CONSTRAINT "purchaseShelfIdFk";
--> statement-breakpoint
ALTER TABLE "purchase" DROP CONSTRAINT "purchaseCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "shelfMember" DROP CONSTRAINT "shelfMemberShelfIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeVarietal" DROP CONSTRAINT "coffeeVarietalCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeVerdict" DROP CONSTRAINT "coffeeVerdictCoffeeIdFk";
--> statement-breakpoint
ALTER TABLE "coffee" ADD CONSTRAINT "coffeeRoasterIdFk" FOREIGN KEY ("roasterId") REFERENCES "public"."roaster"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeFlavorNote" ADD CONSTRAINT "coffeeFlavorNoteCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelfGrinder" ADD CONSTRAINT "shelfGrinderShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "inviteShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notificationCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeFarm" ADD CONSTRAINT "coffeeFarmCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeOrigin" ADD CONSTRAINT "coffeeOriginCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeRegion" ADD CONSTRAINT "coffeeRegionCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeWashingStation" ADD CONSTRAINT "coffeeWashingStationCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeProcess" ADD CONSTRAINT "coffeeProcessCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeProducer" ADD CONSTRAINT "coffeeProducerCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchaseShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchaseCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelfMember" ADD CONSTRAINT "shelfMemberShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeVarietal" ADD CONSTRAINT "coffeeVarietalCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
UPDATE "roaster" SET "id" = substr(md5(random()::text || "id"), 1, 8);--> statement-breakpoint
UPDATE "coffee" SET "id" = substr(md5(random()::text || "id"), 1, 8);--> statement-breakpoint
UPDATE "shelf" SET "id" = substr(md5(random()::text || "id"), 1, 8);
