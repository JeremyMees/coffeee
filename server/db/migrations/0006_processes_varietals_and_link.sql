CREATE TABLE "coffeeProcess" (
	"coffeeId" text NOT NULL,
	"processId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeProcessPk" PRIMARY KEY("coffeeId","processId")
);
--> statement-breakpoint
CREATE TABLE "process" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
CREATE TABLE "coffeeVarietal" (
	"coffeeId" text NOT NULL,
	"varietalId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeVarietalPk" PRIMARY KEY("coffeeId","varietalId")
);
--> statement-breakpoint
CREATE TABLE "varietal" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "varietalNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
ALTER TABLE "coffee" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "coffeeProcess" ADD CONSTRAINT "coffeeProcessCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeProcess" ADD CONSTRAINT "coffeeProcessProcessIdFk" FOREIGN KEY ("processId") REFERENCES "public"."process"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process" ADD CONSTRAINT "processCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeVarietal" ADD CONSTRAINT "coffeeVarietalCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeVarietal" ADD CONSTRAINT "coffeeVarietalVarietalIdFk" FOREIGN KEY ("varietalId") REFERENCES "public"."varietal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "varietal" ADD CONSTRAINT "varietalCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coffeeProcessProcessIdIdx" ON "coffeeProcess" USING btree ("processId");--> statement-breakpoint
CREATE INDEX "coffeeVarietalVarietalIdIdx" ON "coffeeVarietal" USING btree ("varietalId");--> statement-breakpoint
INSERT INTO "process" ("id", "name", "nameKey") VALUES
(gen_random_uuid()::text, 'Washed', 'washed'),
(gen_random_uuid()::text, 'Natural', 'natural'),
(gen_random_uuid()::text, 'Semi washed', 'semi washed'),
(gen_random_uuid()::text, 'Honey', 'honey'),
(gen_random_uuid()::text, 'Anaerobic', 'anaerobic'),
(gen_random_uuid()::text, 'Yeast Inoculated', 'yeast inoculated'),
(gen_random_uuid()::text, 'Co fermentation', 'co fermentation'),
(gen_random_uuid()::text, 'Black diamond', 'black diamond'),
(gen_random_uuid()::text, 'Nitro Maceration', 'nitro maceration'),
(gen_random_uuid()::text, 'Nitro Culturing', 'nitro culturing'),
(gen_random_uuid()::text, 'Extended fermentation', 'extended fermentation'),
(gen_random_uuid()::text, 'Double', 'double'),
(gen_random_uuid()::text, 'Experimental', 'experimental'),
(gen_random_uuid()::text, 'Super natural', 'super natural')
ON CONFLICT ("nameKey") DO NOTHING;
