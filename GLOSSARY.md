# Coffeee

A coffee log for people who love specialty coffee: which coffees are on their
shelf right now, and every coffee they ever bought, so the good ones can be
found and rebought.

## Language

### Coffees and buying them

**Coffee**: A specific coffee from a specific roaster, identified by its roaster
and name. It exists once, no matter how often or by whom it is bought. _Avoid_:
Bean, product, entry

**Roaster**: The company that roasted and sold a coffee. Every coffee has
exactly one. _Avoid_: Brand, shop, seller

**Purchase**: One bag of a coffee that was bought, with its own purchase date,
roast date, size, price and stock status. Rebuying a coffee adds a purchase; it
never adds a coffee. _Avoid_: Bag, order, rebuy, duplicate

**In stock**: A purchase whose bag is not finished yet.

**Finished**: A purchase whose bag has been used up. _Avoid_: Out of stock,
empty

**Current stock**: The coffees on a shelf that have at least one purchase in
stock. _Avoid_: Inventory

**Last bought**: The purchase date of a coffee's most recent purchase. _Avoid_:
Last ordered

**Roast date**: The date printed on a bag, saying when that purchase was
roasted. _Avoid_: Production date, best-before

**Latest roast date**: The roast date of a coffee's most recent purchase that
has one.

### Describing a coffee

**Origin**: A country a coffee's beans were grown in. A blend has several.
_Avoid_: Country, region

**Region**: A growing area within an origin country, such as Huila in Colombia.
_Avoid_: Area, province

**Altitude**: The height above sea level a coffee was grown at, in metres.
_Avoid_: Height, elevation

**Producer**: The person or cooperative that grew a coffee, such as Nestor
Lasso. _Avoid_: Grower, farmer

**Farm**: The farm or estate a coffee was grown on, in one origin country.
_Avoid_: Finca, estate, plantation

**Washing station**: The site where coffee cherries from many growers are
processed, in one origin country. _Avoid_: Mill, wet mill, station

**Process**: A way the coffee cherries were processed after picking, such as
Washed or Anaerobic. A coffee can have several. _Avoid_: Processing method,
fermentation

**Roast level**: How dark a coffee is roasted: Light, Medium, Medium-Dark or
Dark. Every coffee has exactly one. _Avoid_: Roast, roast profile

**Roasted for**: The brew style a roaster roasted a coffee for: Espresso, Filter
or Omni (both). _Avoid_: Roast type, profile

**Varietal**: A cultivated variety of the coffee plant, such as Bourbon or
Geisha. _Avoid_: Variety, cultivar

**Flavor note**: A taste a coffee is described with, such as Lime or Milk
Chocolate. Flavor notes are shared, so coffees can be found by taste. _Avoid_:
Tasting note, taste, notes

### Judging a coffee

**Rating**: A user's verdict of one to five stars on a coffee as a whole, not on
one purchase. Everyone who is signed in sees it with the user's name. _Avoid_:
Score, stars

**Not yet rated**: A coffee the viewer has not rated yet.

**Community rating**: The average of every user's rating of a coffee, with how
many users rated it. _Avoid_: Average score, overall rating

**Review**: One user's rating and would-buy-again verdict on a coffee, shown
with their name in the coffee's review section. Stars only, no written text.
_Avoid_: Comment, opinion

**Would buy again**: A user's yes-or-no verdict on whether a coffee is worth
rebuying, separate from their rating: a five-star coffee can still be too
expensive to buy again. _Avoid_: Rebuy, wishlist

**Favourite**: A coffee the viewer rated four or five stars and would buy again.
_Avoid_: Top coffee, best

### Grinding

**Grinder**: A grinder model, named by its brand and model, such as Fellow Opus
Gen 2. _Avoid_: Mill, machine

**Brew method**: The way coffee is brewed, such as Espresso, Pour over, Moka pot
or AeroPress. _Avoid_: Brew type, recipe, filter (say Pour over or Batch brew)

**Grind setting**: A user's dial setting that works for one coffee on one
grinder for one brew method, written the way that grinder labels its dial.
Everyone who is signed in sees it with the user's name. _Avoid_: Grind size,
grind level

### People

**User**: A person with an account. Every user gets a shelf of their own when
they sign up and can belong to several shelves. _Avoid_: Account, profile

**Shelf**: The coffee a group of users keep together, such as Home or Work. Its
purchases and owned grinders belong to the shelf, not to one user: every member
sees and changes them, and nobody else sees them. Ratings, would-buy-again
verdicts and grind settings belong to each user instead. _Avoid_: Stock,
household, stash, group

**Member**: A user who belongs to a shelf. Every member can add, edit and finish
coffee on it and invite others to it. _Avoid_: Participant, collaborator

**Shelf owner**: The member who created a shelf. Only the shelf owner may remove
members, rename or delete the shelf, and hand ownership to another member.
_Avoid_: Admin, creator

**Invite**: A single-use email invitation from a member to join their shelf. It
is the only way a new person can sign up, besides an admin inviting them without
a shelf. _Avoid_: Invitation link, referral

**Notification**: A message telling members that something happened on a shelf:
an invite, a coffee or purchase added, a bag finished, or a member who joined or
left. It always shows in the app; invites are also emailed, and a user can turn
on email for the others. _Avoid_: Alert, activity, message

**Admin**: A user who may rename, merge and delete entries in the shared lists,
and edit any coffee. _Avoid_: Moderator, shelf owner

**Catalog**: Everything shared by all users: coffees, roasters, flavor notes,
origins, regions, processes, varietals and grinders. A coffee in the catalog can
be edited by the user who added it and by admins. _Avoid_: Database, library

**Library**: Every coffee a shelf ever bought, finished or not, with its
purchases and prices. Only members of the shelf see it. _Avoid_: History,
collection

**Discover**: Where a user browses and searches the whole catalog, including
coffees nobody on their shelf has bought. It never shows other shelves'
purchases or prices. _Avoid_: Search, explore, catalog page
