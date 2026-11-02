# People judge and grind coffee, not shelves

Two people on one shelf can love and dislike the same coffee, and someone with
the same grinder elsewhere has often already found the right setting. So
ratings, would-buy-again verdicts and grind settings belong to a person instead
of a shelf, and everyone who is signed in can see them with that person's name.
This replaces that part of ADR 0005; purchases and owned grinders still belong
to the shelf, and prices and stock stay private to its members.

## Consequences

- A verdict (rating and would buy again) is kept per user and coffee, and a
  grind setting per user, coffee, grinder and brew method. The existing shelf
  verdicts and grind settings move to the member who last changed them.
- Favourites are personal: the Library's Favourites filter uses the viewer's own
  verdicts.
- A coffee shows its community rating, the average of everyone's ratings, and a
  review section listing who gave how many stars and whether they would buy it
  again. Reviews are stars only, no written text.
- Grind settings from everyone show on a coffee, with the ones on grinders the
  viewer's shelf owns first.
- Deleting an account deletes that person's verdicts and grind settings, so
  community ratings are recalculated without them.
