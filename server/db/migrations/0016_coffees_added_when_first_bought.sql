UPDATE "coffee" SET "createdAt" = "firstBought"."purchasedOn"::timestamp
FROM (
  SELECT "coffeeId", min("purchasedOn") AS "purchasedOn" FROM "purchase" GROUP BY "coffeeId"
) AS "firstBought"
WHERE "firstBought"."coffeeId" = "coffee"."id"
  AND "firstBought"."purchasedOn"::timestamp < "coffee"."createdAt";
