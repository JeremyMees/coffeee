<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import { useInviteRevoke, useInvites } from '~/queries/invites'

definePageMeta({ middleware: 'admin' })

useHead({ title: 'Invites · Admin · Coffeee' })

const invites = useInvites()
const { mutateAsync: revokeInvite } = useInviteRevoke()
const adding = ref(false)

async function revoke(id: string) {
  await revokeInvite(id)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <main>
    <NuxtLink
      to="/admin"
      data-testid="admin-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      Admin
    </NuxtLink>
    <PageHeader title="Invites" add-label="Add invite" @add="adding = true" />
    <p class="mt-3 text-xs">
      Emails and links that let someone sign up, until they do or you revoke
      them.
    </p>
    <section class="mt-8 max-w-xl">
      <h2 class="text-xs uppercase">Pending</h2>
      <QuerySection :query="invites" testid="invites">
        <template #default="{ data }">
          <p
            v-if="!data.length"
            class="mt-3 text-xs"
            data-testid="invites-empty"
          >
            No pending invites.
          </p>
          <ul
            v-else
            class="mt-3 flex flex-col divide-y rounded-[18px] border"
            data-testid="invites-pending"
          >
            <li
              v-for="invite in data"
              :key="invite.id"
              data-testid="invite"
              class="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span class="min-w-0 truncate font-sans font-semibold">
                {{ invite.email ?? 'Invite link' }}
                <span
                  v-if="invite.expiresAt"
                  class="font-mono text-xs font-normal"
                >
                  · expires {{ formatDate(invite.expiresAt) }}
                </span>
              </span>
              <button
                type="button"
                data-testid="invite-revoke"
                class="rounded-full px-3 py-1.5 text-xs uppercase transition-colors hover:bg-accent"
                @click="revoke(invite.id)"
              >
                Revoke
              </button>
            </li>
          </ul>
        </template>

        <template #skeleton><InvitesSkeleton /></template>
      </QuerySection>
    </section>
    <AddInviteSheet v-model:open="adding" />
  </main>
</template>
