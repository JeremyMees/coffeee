<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useCoffeeUpdate } from '~/queries/coffees'

const props = defineProps<{
  shelfId: string
  coffee: {
    id: string
    name: string
    roaster: string
    roastLevel: RoastLevel
    roastedFor: RoastedFor
    colour: string
    origins: { code: string; name: string }[]
    regions: OriginEntry[]
    farms: OriginEntry[]
    washingStations: OriginEntry[]
    producers: { name: string }[]
    processes: { name: string }[]
    varietals: { name: string }[]
    link: string | null
    altitudeFrom: number | null
    altitudeTo: number | null
  }
}>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const { mutateAsync: updateCoffee } = useCoffeeUpdate()

function originEntries(entries: OriginEntry[]) {
  return entries.map(({ origin, name }) => ({ origin, name }))
}

function names(entries: { name: string }[]) {
  return entries.map(entry => entry.name)
}

function currentDetails() {
  return {
    name: props.coffee.name,
    roaster: props.coffee.roaster,
    roastLevel: props.coffee.roastLevel,
    roastedFor: props.coffee.roastedFor,
    colour: props.coffee.colour as BagColour,
    origins: props.coffee.origins.map(origin => origin.code),
    regions: originEntries(props.coffee.regions),
    farms: originEntries(props.coffee.farms),
    washingStations: originEntries(props.coffee.washingStations),
    producers: names(props.coffee.producers),
    processes: names(props.coffee.processes),
    varietals: names(props.coffee.varietals),
    link: props.coffee.link ?? '',
    altitudeFrom: props.coffee.altitudeFrom?.toString() ?? '',
    altitudeTo: props.coffee.altitudeTo?.toString() ?? '',
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(coffeeDetailsSchema),
  initialValues: currentDetails(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  resetForm({ values: currentDetails() })
})

const save = handleSubmit(async details => {
  formError.value = ''

  try {
    await updateCoffee({
      shelfId: props.shelfId,
      coffeeId: props.coffee.id,
      details,
    })

    open.value = false
  } catch (error) {
    const { fields, message } = serverErrors(error)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="edit-coffee-sheet"
    title="Edit coffee"
    description="Fix its details for everyone who has it on a shelf."
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="edit-coffee-form"
      @submit="save"
    >
      <CoffeeDetailsFields />

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <button
        type="submit"
        data-testid="edit-coffee-submit"
        class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
        :disabled="isSubmitting"
      >
        Save changes
      </button>
    </form>
  </FormSheet>
</template>
