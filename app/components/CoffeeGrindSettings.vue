<script setup lang="ts">
import { useBrewMethods } from '~/queries/brew-methods'
import { useShelfGrinders } from '~/queries/grinders'
import { useGrindSettingSave } from '~/queries/grind-settings'

const props = defineProps<{
  shelfId: string
  coffeeId: string
  grindSettings: OwnGrindSetting[]
}>()

const grinderQuery = useShelfGrinders(() => props.shelfId)
const brewMethodQuery = useBrewMethods()
await Promise.all([grinderQuery.suspense(), brewMethodQuery.suspense()])

const grinders = computed(() => grinderQuery.data.value ?? [])
const brewMethods = computed(() => brewMethodQuery.data.value ?? [])

const { mutateAsync: saveGrindSetting, isPending: saving } =
  useGrindSettingSave()

const grinderId = ref('')
const brewMethodId = ref('')
const setting = ref('')
const error = ref('')

watch(
  grinders,
  owned => {
    if (!owned.some(grinder => grinder.id === grinderId.value)) {
      grinderId.value = owned[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  brewMethods,
  methods => {
    if (!methods.some(method => method.id === brewMethodId.value)) {
      brewMethodId.value = methods[0]?.id ?? ''
    }
  },
  { immediate: true },
)

function settingFor(grinder: string, brewMethod: string) {
  return props.grindSettings.find(
    saved => saved.grinderId === grinder && saved.brewMethodId === brewMethod,
  )?.setting
}

watch(
  [grinderId, brewMethodId, () => props.grindSettings],
  () => {
    setting.value = settingFor(grinderId.value, brewMethodId.value) ?? ''
  },
  { immediate: true },
)

function edit(saved: OwnGrindSetting) {
  grinderId.value = saved.grinderId
  brewMethodId.value = saved.brewMethodId
}

async function save(change: GrindSettingChange) {
  error.value = ''

  try {
    await saveGrindSetting({
      shelfId: props.shelfId,
      coffeeId: props.coffeeId,
      change,
    })
  } catch (failure) {
    error.value = serverErrors(failure).message
  }
}

function submit() {
  return save({
    grinderId: grinderId.value,
    brewMethodId: brewMethodId.value,
    setting: setting.value.trim() || null,
  })
}

function clear(saved: OwnGrindSetting) {
  return save({
    grinderId: saved.grinderId,
    brewMethodId: saved.brewMethodId,
    setting: null,
  })
}

const action =
  'rounded-full border border-current px-3 py-1.5 text-[11px] uppercase disabled:opacity-60'
</script>

<template>
  <section class="mt-10" data-testid="grind-settings">
    <h2 class="text-[28px]">Grind settings</h2>
    <p
      v-if="!grinders.length"
      class="mt-3 text-xs"
      data-testid="grind-no-grinders"
    >
      This shelf owns no grinders yet.
      <NuxtLink
        :to="`/shelves/${shelfId}/settings?tab=grinders`"
        data-testid="grind-add-grinder"
        class="underline underline-offset-4"
      >
        Add a grinder
      </NuxtLink>
    </p>
    <template v-else>
      <p
        v-if="!grindSettings.length"
        class="mt-3 text-xs"
        data-testid="grind-settings-empty"
      >
        You have no grind settings for this coffee yet.
      </p>
      <ul
        v-else
        class="mt-4 divide-y rounded-[18px] border text-xs"
        data-testid="grind-settings-list"
      >
        <li
          v-for="saved in grindSettings"
          :key="`${saved.grinderId}:${saved.brewMethodId}`"
          data-testid="grind-setting"
          class="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <span data-testid="grind-setting-for">
            {{ grinderName(saved) }} · {{ saved.brewMethod }}
          </span>
          <span class="flex items-center gap-2">
            <strong
              class="font-sans text-sm font-semibold"
              data-testid="grind-setting-value"
            >
              {{ saved.setting }}
            </strong>
            <button
              type="button"
              data-testid="grind-setting-edit"
              :class="action"
              @click="edit(saved)"
            >
              Edit
            </button>
            <button
              type="button"
              data-testid="grind-setting-clear"
              :class="action"
              :disabled="saving"
              @click="clear(saved)"
            >
              Clear
            </button>
          </span>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 text-xs sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
        novalidate
        data-testid="grind-setting-form"
        @submit.prevent="submit"
      >
        <Field>
          <FieldLabel for="grind-grinder" class="text-xs">Grinder</FieldLabel>
          <NativeSelect
            id="grind-grinder"
            v-model="grinderId"
            class="w-full"
            data-testid="grind-grinder"
          >
            <NativeSelectOption
              v-for="grinder in grinders"
              :key="grinder.id"
              :value="grinder.id"
            >
              {{ grinderName(grinder) }}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel for="grind-brew-method" class="text-xs">
            Brew method
          </FieldLabel>
          <NativeSelect
            id="grind-brew-method"
            v-model="brewMethodId"
            class="w-full"
            data-testid="grind-brew-method"
          >
            <NativeSelectOption
              v-for="method in brewMethods"
              :key="method.id"
              :value="method.id"
            >
              {{ method.name }}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel for="grind-setting" class="text-xs">Setting</FieldLabel>
          <Input
            id="grind-setting"
            v-model="setting"
            data-testid="grind-setting-input"
            autocomplete="off"
            maxlength="30"
            placeholder="12"
          />
        </Field>
        <button
          type="submit"
          data-testid="grind-setting-save"
          :class="[action, 'h-8 border-primary']"
          :disabled="saving"
        >
          Save
        </button>
      </form>
      <Alert
        v-if="error"
        variant="destructive"
        class="mt-4"
        data-testid="grind-setting-error"
      >
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </template>
  </section>
</template>
