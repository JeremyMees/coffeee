<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { useForm } from 'vee-validate'
import {
  useShelfInviteCancel,
  useShelfInviteCreate,
  useShelfInvites,
} from '~/queries/invites'

const props = defineProps<{ shelfId: string }>()

const invited = useShelfInvites(() => props.shelfId)

const { mutateAsync: createInvite } = useShelfInviteCreate()
const { mutateAsync: cancelInvite } = useShelfInviteCancel()

const formError = ref('')
const sentTo = ref('')
const locale = useLocale()

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(inviteEmailSchema),
  initialValues: { email: '' },
})

const invite = handleSubmit(async ({ email }) => {
  formError.value = ''
  sentTo.value = ''

  try {
    await createInvite({ shelfId: props.shelfId, email })

    resetForm()
    sentTo.value = email
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})

async function cancel(inviteId: string) {
  await cancelInvite({ shelfId: props.shelfId, inviteId })
}
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="shelf-invites">
    <div>
      <h2 class="text-[28px]">Invites</h2>
      <p class="mt-1 text-xs">
        Invite someone by email to keep this shelf with you. The link in the
        email works once, for a week.
      </p>
    </div>
    <form
      class="flex flex-col gap-3"
      novalidate
      data-testid="shelf-invite-form"
      @submit="invite"
    >
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="email"
        label="Email"
        input-id="shelf-invite-email"
      >
        <Input
          id="shelf-invite-email"
          v-bind="componentField"
          data-testid="shelf-invite-email"
          type="email"
          autocomplete="off"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
      <Alert v-if="sentTo" data-testid="shelf-invite-sent">
        <AlertDescription>Invite sent to {{ sentTo }}.</AlertDescription>
      </Alert>
      <Alert
        v-if="formError"
        variant="destructive"
        data-testid="shelf-invite-error"
      >
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <Button
        type="submit"
        data-testid="shelf-invite-submit"
        class="self-start"
        :disabled="isSubmitting"
      >
        Send invite
      </Button>
    </form>
    <QuerySection :query="invited" testid="shelf-invites">
      <template #default="{ data: invites }">
        <p
          v-if="!invites.length"
          class="text-xs"
          data-testid="shelf-invites-empty"
        >
          No pending invites.
        </p>
        <ul v-else class="divide-y rounded-[18px] border text-xs">
          <li
            v-for="pending in invites"
            :key="pending.id"
            data-testid="shelf-invite"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span class="min-w-0">
              <span class="block truncate font-sans font-semibold">
                {{ pending.email }}
              </span>
              <span class="block">
                From {{ pending.invitedBy }}
                <template v-if="pending.expiresAt">
                  · expires {{ formatDayMonth(pending.expiresAt, locale) }}
                </template>
              </span>
            </span>
            <Button
              type="button"
              data-testid="shelf-invite-cancel"
              variant="ghost"
              size="icon-sm"
              :aria-label="`Cancel the invite to ${pending.email}`"
              @click="cancel(pending.id)"
            >
              <XIcon class="size-4" aria-hidden="true" />
            </Button>
          </li>
        </ul>
      </template>
      <template #skeleton><ShelfInvitesSkeleton /></template>
    </QuerySection>
  </section>
</template>
