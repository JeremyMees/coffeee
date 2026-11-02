<script setup lang="ts">
const user = useCurrentUser()

useHead({ title: 'Profile · Coffeee' })
</script>

<template>
  <main>
    <PageHeader title="Profile" />
    <dl
      v-if="user"
      class="mt-8 grid max-w-md gap-x-4 gap-y-3 rounded-[18px] border p-4 sm:grid-cols-2"
    >
      <div>
        <dt class="text-[10px] uppercase">Name</dt>
        <dd class="mt-0.5 font-sans font-semibold">{{ user.name }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-[10px] uppercase">Email</dt>
        <dd class="mt-0.5 truncate font-sans font-semibold">
          {{ user.email }}
        </dd>
      </div>
    </dl>
    <div class="mt-6 flex gap-2">
      <Button v-if="user?.role === 'admin'" variant="outline" as-child>
        <NuxtLink to="/admin/invites">Invites</NuxtLink>
      </Button>
      <Button variant="outline" @click="signOut">Sign out</Button>
    </div>
  </main>
</template>
