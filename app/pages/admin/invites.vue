<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'

definePageMeta({ middleware: 'admin' })

useHead({ title: 'Invites · Coffeee' })

const { data: invites, refresh } = await useFetch('/api/invites', {
  default: () => [],
})

const email = ref('')
const emailError = ref('')
const allowing = ref(false)
const link = ref('')
const copied = ref(false)

async function allowEmail() {
  allowing.value = true
  emailError.value = ''

  try {
    await $fetch('/api/invites', {
      method: 'POST',
      body: { email: email.value },
    })

    email.value = ''

    await refresh()
  } catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage

    emailError.value = message || 'Something went wrong. Try again.'
  } finally {
    allowing.value = false
  }
}

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
      <h1 class="text-3xl font-bold">Invites</h1>
      <Button variant="ghost" as-child>
        <NuxtLink to="/">Done</NuxtLink>
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
        <form class="flex flex-col gap-3" @submit.prevent="allowEmail">
          <FieldGroup>
            <Field :data-invalid="emailError ? true : undefined">
              <FieldLabel for="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                v-model="email"
                type="email"
                autocomplete="off"
                required
                :aria-invalid="emailError ? true : undefined"
              />
              <FieldError v-if="emailError">{{ emailError }}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" :disabled="allowing">Allow email</Button>
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
          <Input :model-value="link" readonly aria-label="Invite link" />
          <Button
            variant="outline"
            size="icon"
            :aria-label="copied ? 'Copied' : 'Copy link'"
            @click="copyLink"
          >
            <CheckIcon v-if="copied" />
            <CopyIcon v-else />
          </Button>
        </div>
        <Button variant="outline" @click="createLink">Create a link</Button>
      </CardContent>
    </Card>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Pending</h2>
      <p v-if="!invites.length" class="text-sm text-muted-foreground">
        No pending invites.
      </p>
      <ul v-else class="flex flex-col divide-y rounded-lg border">
        <li
          v-for="invite in invites"
          :key="invite.id"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span class="min-w-0 truncate">
            {{ invite.email ?? 'Invite link' }}
            <span v-if="invite.expiresAt" class="text-sm text-muted-foreground">
              · expires {{ formatDate(invite.expiresAt) }}
            </span>
          </span>
          <Button variant="ghost" size="sm" @click="revoke(invite.id)">
            Revoke
          </Button>
        </li>
      </ul>
    </section>
  </main>
</template>
