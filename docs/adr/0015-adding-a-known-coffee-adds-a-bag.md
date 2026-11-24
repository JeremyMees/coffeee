# Adding a known coffee adds a bag

A coffee exists once, identified by its roaster and name (see
[GLOSSARY.md](../../GLOSSARY.md)). The add coffee form used to accept a coffee
the catalog already had: the server kept the existing coffee, added the bag to
it and quietly threw away every detail typed in the other steps. Nothing told
the person that their coffee was already there.

Now the form looks the coffee up as soon as its name and roaster are filled in
(`GET /api/shelves/:shelfId/coffee-match`), with the same spelling rules as the
catalog's unique key. When it is there, a notice under those fields says so and
offers to add a bag to it, skipping the details steps. The wording depends on
the shelf: still in stock ("Bought another bag?"), bought before, or only in the
catalog. Adding the coffee anyway is refused with a 409 and a message on the
name field, so details are never silently dropped.

## Considered Options

- **Accept it and say so afterwards**: the details are still lost, and the
  person only finds out once the work is done.
- **A search-or-add picker for the name**: the clearest, but the name field
  becomes a second roaster picker and only works once the roaster is picked.
- **Search the catalog before showing the form**: prevents duplicates best, but
  adds a step for every new coffee.

## Consequences

- `POST /api/shelves/:shelfId/coffees` refuses a coffee the catalog already has.
  A bag for a known coffee goes through
  `POST /api/shelves/:shelfId/coffees/:coffeeId/purchases`.
- `addCoffee` itself still adds a bag to a coffee that turns up between the
  check and the insert, so two people adding the same new coffee at once both
  end up with a bag of the one coffee.
