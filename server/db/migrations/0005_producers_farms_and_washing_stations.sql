CREATE TABLE "coffeeFarm" (
	"coffeeId" text NOT NULL,
	"farmId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeFarmPk" PRIMARY KEY("coffeeId","farmId")
);
--> statement-breakpoint
CREATE TABLE "coffeeWashingStation" (
	"coffeeId" text NOT NULL,
	"washingStationId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeWashingStationPk" PRIMARY KEY("coffeeId","washingStationId")
);
--> statement-breakpoint
CREATE TABLE "farm" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"originCode" text NOT NULL,
	CONSTRAINT "farmOriginCodeNameKeyUnique" UNIQUE("originCode","nameKey")
);
--> statement-breakpoint
CREATE TABLE "washingStation" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"originCode" text NOT NULL,
	CONSTRAINT "washingStationOriginCodeNameKeyUnique" UNIQUE("originCode","nameKey")
);
--> statement-breakpoint
CREATE TABLE "coffeeProducer" (
	"coffeeId" text NOT NULL,
	"producerId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeProducerPk" PRIMARY KEY("coffeeId","producerId")
);
--> statement-breakpoint
CREATE TABLE "producer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "producerNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
ALTER TABLE "coffeeFarm" ADD CONSTRAINT "coffeeFarmCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeFarm" ADD CONSTRAINT "coffeeFarmFarmIdFk" FOREIGN KEY ("farmId") REFERENCES "public"."farm"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeWashingStation" ADD CONSTRAINT "coffeeWashingStationCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeWashingStation" ADD CONSTRAINT "coffeeWashingStationWashingStationIdFk" FOREIGN KEY ("washingStationId") REFERENCES "public"."washingStation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm" ADD CONSTRAINT "farmOriginCodeFk" FOREIGN KEY ("originCode") REFERENCES "public"."origin"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm" ADD CONSTRAINT "farmCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "washingStation" ADD CONSTRAINT "washingStationOriginCodeFk" FOREIGN KEY ("originCode") REFERENCES "public"."origin"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "washingStation" ADD CONSTRAINT "washingStationCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeProducer" ADD CONSTRAINT "coffeeProducerCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeProducer" ADD CONSTRAINT "coffeeProducerProducerIdFk" FOREIGN KEY ("producerId") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer" ADD CONSTRAINT "producerCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coffeeFarmFarmIdIdx" ON "coffeeFarm" USING btree ("farmId");--> statement-breakpoint
CREATE INDEX "coffeeWashingStationWashingStationIdIdx" ON "coffeeWashingStation" USING btree ("washingStationId");--> statement-breakpoint
CREATE INDEX "coffeeProducerProducerIdIdx" ON "coffeeProducer" USING btree ("producerId");