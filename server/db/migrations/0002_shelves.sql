CREATE TABLE "shelf" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ownerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelfMember" (
	"shelfId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelfMemberPk" PRIMARY KEY("shelfId","userId")
);
--> statement-breakpoint
ALTER TABLE "shelf" ADD CONSTRAINT "shelfOwnerIdFk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelfMember" ADD CONSTRAINT "shelfMemberShelfIdFk" FOREIGN KEY ("shelfId") REFERENCES "public"."shelf"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelfMember" ADD CONSTRAINT "shelfMemberUserIdFk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shelfOwnerIdIdx" ON "shelf" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "shelfMemberUserIdIdx" ON "shelfMember" USING btree ("userId");--> statement-breakpoint
INSERT INTO "shelf" ("id", "name", "ownerId") SELECT gen_random_uuid()::text, split_part("name", ' ', 1) || '''s shelf', "id" FROM "user";--> statement-breakpoint
INSERT INTO "shelfMember" ("shelfId", "userId") SELECT "id", "ownerId" FROM "shelf";
