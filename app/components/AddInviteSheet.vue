<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { useInviteCreate } from '~/queries/invites'

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const link = ref('')
const copied = ref(false)
const { mutateAsync: createInvite } = useInviteCreate()

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(inviteEmailSchema),
  initialValues: { email: '' },
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  link.value = ''
  copied.value = false
  resetForm({ values: { email: '' } })
})

const allowEmail = handleSubmit(async body => {
  formError.value = ''

  try {
    await createInvite(body)

    open.value = false
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})

async function createLink() {
  const created = await createInvite({ link: true })

  link.value = 'url' in created ? created.url : ''
  copied.value = false
}

async function copyLink() {
  await navigator.clipboard.writeText(link.value)

  copied.value = true
}
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="add-invite-sheet"
    title="Add invite"
    description="Let someone sign up without a shelf invite."
  >
    <div
      class="flex flex-col gap-8 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
    >
      <form
        class="flex flex-col gap-4"
        novalidate
        data-testid="invite-email-form"
        @submit="allowEmail"
      >
        <div>
          <h3 class="font-sans text-lg font-semibold">Allow an email</h3>
          <p class="mt-1 text-xs">
            That person can sign in with Google using this address. It stays
            allowed until they sign up or you revoke it.
          </p>
        </div>
        <FieldGroup>
          <LabelledField
            v-slot="{ componentField, invalid }"
            name="email"
            label="Email"
            input-id="invite-email"
          >
            <Input
              id="invite-email"
              v-bind="componentField"
              data-testid="invite-email"
              type="email"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
        </FieldGroup>
        <Alert v-if="formError" variant="destructive" data-testid="form-error">
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>
        <button
          type="submit"
          data-testid="invite-email-submit"
          class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
          :disabled="isSubmitting"
        >
          Allow email
        </button>
      </form>

      <section class="flex flex-col gap-4 border-t pt-6">
        <div>
          <h3 class="font-sans text-lg font-semibold">Invite link</h3>
          <p class="mt-1 text-xs">
            Anyone with the link can join once, within seven days. You can only
            copy it now.
          </p>
        </div>
        <div v-if="link" class="flex gap-2">
          <Input
            :model-value="link"
            readonly
            aria-label="Invite link"
            data-testid="invite-link"
          />
          <Button
            variant="outline"
            size="icon"
            data-testid="invite-link-copy"
            :aria-label="copied ? 'Copied' : 'Copy link'"
            @click="copyLink"
          >
            <CheckIcon v-if="copied" />
            <CopyIcon v-else />
          </Button>
        </div>
        <button
          type="button"
          data-testid="invite-link-create"
          class="flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3 text-sm uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
          @click="createLink"
        >
          Create a link
        </button>
      </section>
    </div>
  </FormSheet>
</template>
