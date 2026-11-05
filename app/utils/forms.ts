import type { TypedSchema, TypedSchemaError } from 'vee-validate'
import type { z } from 'zod'

export function zodSchema<Schema extends z.ZodType>(
  schema: Schema,
): TypedSchema<z.input<Schema>, z.output<Schema>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)

      if (result.success) return { value: result.data, errors: [] }

      const errors = new Map<string, TypedSchemaError>()

      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        const error = errors.get(path) ?? { path, errors: [] }
        error.errors.push(issue.message)
        errors.set(path, error)
      }

      return { errors: [...errors.values()] }
    },
  }
}

export function serverErrors(caught: unknown) {
  const { statusMessage, data } = caught as FetchFailure
  const fields = data?.data?.errors ?? {}
  const hasFields = Object.keys(fields).length > 0

  return {
    fields,
    message: hasFields
      ? ''
      : statusMessage || 'Something went wrong. Try again.',
  }
}

export const coffeeSteps = [
  { title: 'Coffee', fields: ['name', 'roaster', 'link'] },
  {
    title: 'Origin',
    fields: [
      'origins',
      'regions',
      'farms',
      'washingStations',
      'altitudeFrom',
      'altitudeTo',
      'producers',
    ],
  },
  {
    title: 'Taste',
    fields: [
      'processes',
      'varietals',
      'flavorNotes',
      'roastLevel',
      'roastedFor',
    ],
  },
] as const satisfies FormStep[]

export const firstBagStep = {
  title: 'First bag',
  fields: ['purchasedOn', 'roastedOn', 'sizeGrams', 'price'],
} as const satisfies FormStep

export function coffeeFormSteps(withFirstBag: boolean): FormStep[] {
  return withFirstBag ? [...coffeeSteps, firstBagStep] : [...coffeeSteps]
}

function originEntries(entries: OriginEntry[]) {
  return entries.map(({ origin, name }) => ({ origin, name }))
}

function names(entries: ListEntry[]) {
  return entries.map(entry => entry.name)
}

export function coffeeFormValues(coffee?: EditableCoffee) {
  return {
    name: coffee?.name ?? '',
    roaster: coffee?.roaster ?? '',
    roastLevel: coffee?.roastLevel,
    roastedFor: coffee?.roastedFor,
    origins: coffee?.origins.map(origin => origin.code) ?? [],
    regions: originEntries(coffee?.regions ?? []),
    farms: originEntries(coffee?.farms ?? []),
    washingStations: originEntries(coffee?.washingStations ?? []),
    producers: names(coffee?.producers ?? []),
    processes: names(coffee?.processes ?? []),
    varietals: names(coffee?.varietals ?? []),
    flavorNotes: names(coffee?.flavorNotes ?? []),
    link: coffee?.link ?? '',
    altitudeFrom: coffee?.altitudeFrom?.toString() ?? '',
    altitudeTo: coffee?.altitudeTo?.toString() ?? '',
  }
}

export function stepHasError(step: FormStep, fields: string[]) {
  return step.fields.some(field =>
    fields.some(error => error === field || error.startsWith(`${field}.`)),
  )
}

export function firstStepWithError(steps: FormStep[], fields: string[]) {
  const index = steps.findIndex(step => stepHasError(step, fields))

  return index === -1 ? null : index + 1
}
