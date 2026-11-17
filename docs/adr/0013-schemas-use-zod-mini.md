# Schemas use zod/mini

The shared schemas in `shared/utils/schemas.ts` validate forms in the browser
and requests on the server, and the app's input types come from them. They
import `zod/mini` instead of `zod`: the same engine, error messages and checks,
but written as functions (`z.string().check(z.trim(), z.maxLength(80))`,
`z.optional(...)`, `z._default(...)`, `z.extend(...)`) instead of chained
methods. Classic zod puts every method on every schema, so none of it can be
left out of the bundle. With `zod/mini`, zod's share of the browser chunks went
from about 27 kB to about 14 kB gzipped, on every page with a form, sign-in
included.

Write new schemas and helpers with `zod/mini` too, and type them with
`z.ZodMiniType`. One import of classic `zod` in browser code brings the whole
library back.

## Considered Options

- **Keep classic zod**: nicer to write, but twice the size for the same
  behaviour.
- **Compile the schemas ahead of time** (typia, Ajv standalone code): nothing
  compiles zod as it is. Those tools would need a second schema system next to
  the zod schemas the server and the types depend on, and they lose
  `preprocess`, refinements with `when`, transforms and our own error messages.

## Consequences

- `zod/mini` has no `z.preprocess`. The `preprocess` helper in
  `shared/utils/schemas.ts` pipes a transform into the schema, the same as
  classic zod does under the hood.
- A pipe's input schema is `schema._zod.def.in`, not `schema.in`.
