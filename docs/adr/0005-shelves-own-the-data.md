# Shelves own the data, not users

People want to keep one stock of coffee together, such as a couple at home or a
group at work, and act as one: everyone adds, finishes and rates the same bags.
So purchases, ratings, would-buy-again verdicts, grind settings and owned
grinders belong to a shelf instead of a user, and a user can belong to several
shelves, switching between them in the app. Every user gets a shelf of their own
at sign-up, so a person alone and a group work the same way. The catalog stays
shared by everyone, as before.

## Consequences

- Every query for shelf data is scoped to one shelf, and every API route checks
  that the signed-in user is a member of it; integration tests cover that
  non-members get nothing.
- The current shelf is part of the URL, so links and the PWA reopen on the same
  shelf and two tabs can show different shelves.
- The member who created a shelf is its shelf owner and the only one who can
  remove members, rename or delete it, or hand it over. Deleting an account
  first hands each shelf it owns to another member, or deletes the shelf when
  nobody else is in it.
- Things a user does stay attributed to them inside the shelf (who added a
  purchase, who finished a bag), so notifications can say who did what.
