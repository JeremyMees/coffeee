ALTER TABLE "roaster" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "roaster" ADD COLUMN "countryCode" text;--> statement-breakpoint
ALTER TABLE "roaster" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "roaster" ADD COLUMN "logoUrl" text;--> statement-breakpoint
ALTER TABLE "roaster" ADD CONSTRAINT "roasterCountryCodeFk" FOREIGN KEY ("countryCode") REFERENCES "public"."origin"("code") ON DELETE no action ON UPDATE no action;