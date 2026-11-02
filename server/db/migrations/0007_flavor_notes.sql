CREATE TABLE "coffeeFlavorNote" (
	"coffeeId" text NOT NULL,
	"flavorNoteId" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "coffeeFlavorNotePk" PRIMARY KEY("coffeeId","flavorNoteId")
);
--> statement-breakpoint
CREATE TABLE "flavorNote" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nameKey" text NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flavorNoteNameKeyUnique" UNIQUE("nameKey")
);
--> statement-breakpoint
ALTER TABLE "coffeeFlavorNote" ADD CONSTRAINT "coffeeFlavorNoteCoffeeIdFk" FOREIGN KEY ("coffeeId") REFERENCES "public"."coffee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeFlavorNote" ADD CONSTRAINT "coffeeFlavorNoteFlavorNoteIdFk" FOREIGN KEY ("flavorNoteId") REFERENCES "public"."flavorNote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flavorNote" ADD CONSTRAINT "flavorNoteCreatedByFk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coffeeFlavorNoteFlavorNoteIdIdx" ON "coffeeFlavorNote" USING btree ("flavorNoteId");