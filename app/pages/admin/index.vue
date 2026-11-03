<script setup lang="ts">
import { ArrowRightIcon } from '@lucide/vue'

definePageMeta({ middleware: 'admin' })

useHead({ title: 'Admin · Coffeee' })

const sections = [
  {
    title: 'People',
    links: [{ label: 'Invites', to: '/admin/invites' }],
  },
  {
    title: 'Shared lists',
    links: adminLists.map(list => ({
      label: adminListNouns[list].many,
      to: `/admin/lists/${list}`,
    })),
  },
]
</script>

<template>
  <main>
    <PageHeader title="Admin" hide-add />
    <p class="mt-3 text-xs">
      Invite people and keep the lists everyone shares clean.
    </p>
    <section
      v-for="section in sections"
      :key="section.title"
      class="mt-8"
      data-testid="admin-section"
    >
      <h2 class="text-xs uppercase">{{ section.title }}</h2>
      <ul class="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <li v-for="link in section.links" :key="link.to">
          <NuxtLink
            :to="link.to"
            data-testid="admin-link"
            class="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3 font-sans font-semibold transition-colors hover:border-primary"
          >
            {{ link.label }}
            <ArrowRightIcon class="size-4" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>
