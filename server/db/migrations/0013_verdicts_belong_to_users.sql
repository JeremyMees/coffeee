ALTER TABLE "coffeeVerdict" DROP CONSTRAINT "coffeeVerdictShelfIdFk";
--> statement-breakpoint
ALTER TABLE "coffeeVerdict" DROP CONSTRAINT "coffeeVerdictUpdatedByFk";
--> statement-breakpoint
ALTER TABLE "coffeeVerdict" DROP CONSTRAINT "coffeeVerdictPk";
--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffeeVerdict" DROP COLUMN "shelfId";--> statement-breakpoint
ALTER TABLE "coffeeVerdict" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "coffeeVerdict" ADD CONSTRAINT "coffeeVerdictPk" PRIMARY KEY("userId","coffeeId");
