CREATE TABLE "coffeeVerdict" (
	"shelfId" text NOT NULL,
	"coffeeId" text NOT NULL,
	"rating" smallint,
	"wouldBuyAgain" boolean DEFAULT false NOT NULL,
	"updatedBy" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coffeeVerdictPk" PRIMARY KEY("shelfId","coffeeId"),
	CONSTRAINT "coffeeVerdictRatingCheck" CHECK ("coffeeVerdict"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictUpdatedByFk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coffeeVerdictCoffeeIdIdx" ON "coffeeVerdict" USING btree ("coffeeId");