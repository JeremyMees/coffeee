CREATE TABLE "brewMethod" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "brewMethodNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
CREATE TABLE "grindSetting" (
	"shelfId" text NOT NULL,
	"coffeeId" text NOT NULL,
	"grinderId" text NOT NULL,
	"brewMethodId" text NOT NULL,
	"setting" text NOT NULL,
	"updatedBy" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grindSettingPk" PRIMARY KEY("shelfId","coffeeId","grinderId","brewMethodId")
);
--> statement-breakpoint
CREATE TABLE "grinder" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"brandId" text NOT NULL,
	CONSTRAINT "grinderBrandIdNameKeyUnique" UNIQUE("brandId","nameKey")
);
--> statement-breakpoint
CREATE TABLE "grinderBrand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grinderBrandNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
CREATE TABLE "shelfGrinder" (
	"shelfId" text NOT NULL,
	"grinderId" text NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelfGrinderPk" PRIMARY KEY("shelfId","grinderId")
);
--> statement-breakpoint
ALTER TABLE "brewMethod" ADD CONSTRAINT "brewMethodCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingGrinderIdFk" FOREIGN KEY ("grinderId") REFERENCES "public"."grinder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingBrewMethodIdFk" FOREIGN KEY ("brewMethodId") REFERENCES "public"."brewMethod"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grindSetting" ADD CONSTRAINT "grindSettingUpdatedByFk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinder" ADD CONSTRAINT "grinderBrandIdFk" FOREIGN KEY ("brandId") REFERENCES "public"."grinderBrand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinder" ADD CONSTRAINT "grinderCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinderBrand" ADD CONSTRAINT "grinderBrandCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelfGrinder" ADD CONSTRAINT "shelfGrinderShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelfGrinder" ADD CONSTRAINT "shelfGrinderGrinderIdFk" FOREIGN KEY ("grinderId") REFERENCES "public"."grinder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grindSettingCoffeeIdIdx" ON "grindSetting" USING btree ("coffeeId");--> statement-breakpoint
CREATE INDEX "grindSettingGrinderIdIdx" ON "grindSetting" USING btree ("grinderId");--> statement-breakpoint
CREATE INDEX "grindSettingBrewMethodIdIdx" ON "grindSetting" USING btree ("brewMethodId");--> statement-breakpoint
CREATE INDEX "shelfGrinderGrinderIdIdx" ON "shelfGrinder" USING btree ("grinderId");--> statement-breakpoint
INSERT INTO "brewMethod" ("id", "name", "nameKey", "position") VALUES
	(gen_random_uuid()::text, 'Espresso', 'espresso', 0),
	(gen_random_uuid()::text, 'Pour over', 'pour over', 1),
	(gen_random_uuid()::text, 'AeroPress', 'aeropress', 2),
	(gen_random_uuid()::text, 'Moka pot', 'moka pot', 3),
	(gen_random_uuid()::text, 'French press', 'french press', 4),
	(gen_random_uuid()::text, 'Cold brew', 'cold brew', 5),
	(gen_random_uuid()::text, 'Batch brew', 'batch brew', 6);
