<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { Field as VeeField, useForm } from 'vee-validate'

definePageMeta({ middleware: 'admin' })

useHead({ title: 'Invites · Coffeee' })

const { data: invites, refresh } = await useFetch('/api/invites', {
  default: () => [],
})

const formError = ref('')

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(inviteEmailSchema),
  initialValues: { email: '' },
})

const link = ref('')
const copied = ref(false)

const allowEmail = handleSubmit(async body => {
  formError.value = ''

  try {
    await $fetch('/api/invites', { method: 'POST', body })

    resetForm()

    await refresh()
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})

async function createLink() {
  const created = await $fetch('/api/invites', {
    method: 'POST',
    body: { link: true },
  })

  link.value = 'url' in created ? created.url : ''
  copied.value = false

  await refresh()
}

async function copyLink() {
  await navigator.clipboard.writeText(link.value)

  copied.value = true
}

async function revoke(id: string) {
  await $fetch(`/api/invites/${id}`, { method: 'DELETE' })
  await refresh()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 px-6 py-10">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-3xl font-bold" data-testid="invites-title">Invites</h1>
      <Button variant="ghost" as-child>
        <NuxtLink to="/profile">Done</NuxtLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Allow an email</CardTitle>
        <CardDescription>
          That person can sign in with Google using this address. It stays
          allowed until they sign up or you revoke it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          class="flex flex-col gap-3"
          novalidate
          data-testid="invite-email-form"
          @submit="allowEmail"
        >
          <FieldGroup>
            <VeeField v-slot="{ componentField, errors }" name="email">
              <Field
                :data-invalid="errors.length || formError ? true : undefined"
              >
                <FieldLabel for="invite-email">Email</FieldLabel>
                <Input
                  id="invite-email"
                  v-bind="componentField"
                  data-testid="invite-email"
                  type="email"
                  autocomplete="off"
                  :aria-invalid="errors.length || formError ? true : undefined"
                />
                <FieldError :errors="formError ? [formError] : errors" />
              </Field>
            </VeeField>
          </FieldGroup>
          <Button
            type="submit"
            data-testid="invite-email-submit"
            :disabled="isSubmitting"
          >
            Allow email
          </Button>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Invite link</CardTitle>
        <CardDescription>
          Anyone with the link can join once, within seven days. You can only
          copy it now.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
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
        <Button
          variant="outline"
          data-testid="invite-link-create"
          @click="createLink"
        >
          Create a link
        </Button>
      </CardContent>
    </Card>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Pending</h2>
      <p
        v-if="!invites.length"
        class="text-sm text-muted-foreground"
        data-testid="invites-empty"
      >
        No pending invites.
      </p>
      <ul
        v-else
        class="flex flex-col divide-y rounded-lg border"
        data-testid="invites-pending"
      >
        <li
          v-for="invite in invites"
          :key="invite.id"
          data-testid="invite"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span class="min-w-0 truncate">
            {{ invite.email ?? 'Invite link' }}
            <span v-if="invite.expiresAt" class="text-sm text-muted-foreground">
              · expires {{ formatDate(invite.expiresAt) }}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            data-testid="invite-revoke"
            @click="revoke(invite.id)"
          >
            Revoke
          </Button>
        </li>
      </ul>
    </section>
  </main>
</template>
