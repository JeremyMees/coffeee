CREATE TYPE "public"."roastLevel" AS ENUM('light', 'medium', 'medium-dark', 'dark');--> statement-breakpoint
CREATE TYPE "public"."roastedFor" AS ENUM('espresso', 'filter', 'omni');--> statement-breakpoint
CREATE TABLE "coffee" (
	"id" text PRIMARY KEY NOT NULL,
	"roasterId" text NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"roastLevel" "roastLevel" NOT NULL,
	"roastedFor" "roastedFor" NOT NULL,
	"colour" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coffeeRoasterIdNameKeyUnique" UNIQUE("roasterId","nameKey")
);
--> statement-breakpoint
CREATE TABLE "roaster" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roasterNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"shelfId" text NOT NULL,
	"coffeeId" text NOT NULL,
	"purchasedOn" date NOT NULL,
	"roastedOn" date,
	"sizeGrams" integer,
	"priceCents" integer,
	"finishedAt" timestamp,
	"addedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coffee" ADD CONSTRAINT "coffeeRoasterIdFk" FOREIGN KEY ("roasterId") REFERENCES "public"."roaster"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee" ADD CONSTRAINT "coffeeCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roaster" ADD CONSTRAINT "roasterCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchaseShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchaseCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchaseAddedByFk" FOREIGN KEY ("addedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchaseShelfIdCoffeeIdIdx" ON "purchase" USING btree ("shelfId","coffeeId");--> statement-breakpoint
CREATE INDEX "purchaseCoffeeIdIdx" ON "purchase" USING btree ("coffeeId");