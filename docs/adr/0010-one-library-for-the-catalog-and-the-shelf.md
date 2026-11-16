# One Library for the catalog and the shelf's coffees

The app had two pages for finding a coffee: the Library, with every coffee the
shelf bought, and Discover, with the whole catalog. They shared the search and
the filters but differed in everything else, so people had to know which page to
open, and a coffee they half remembered could be on either.

They are now one page, the Library. It shows the whole catalog by default, and a
switch labelled "All coffees | Bought" narrows it to the coffees the shelf
bought. Both sides have the same search, filters, Favourites toggle, sorting and
grid or table view, so switching keeps what was picked. `/discover` is gone.

## Consequences

- One endpoint lists the catalog for a shelf, with a `bought` setting. Prices
  and last bought dates only come from that shelf's own purchases, as in
  [ADR 0005](0005-shelves-own-the-data.md).
- Both sides use the catalog card: roast, origin, flavor notes, community rating
  and the viewer's own rating, which reads "Not rated" when missing so cards in
  a row line up. A "Bought" badge marks bought coffees on the "All" side only.
  The freshness row of the old Library card is gone; Stock shows freshness.
- The table has the same columns on both sides, plus Latest price and Last
  bought on the "Bought" side. Those two sorts exist only there; switching to
  "All" while using one falls back to Newest.
- "All" sorts by Newest and "Bought" by Last bought unless the viewer picks a
  sort.
- Filter options follow the side: on "Bought" they only list what the shelf
  bought.
- Favourites work on both sides, because verdicts belong to people, not shelves
  ([ADR 0007](0007-people-judge-and-grind-not-shelves.md)).
- A Library link sorted by Last bought or Latest price opens on "Bought", since
  only that side has those sorts.
