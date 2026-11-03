<script setup lang="ts">
const user = useCurrentUser()
const deleting = ref(false)

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
        <dd class="mt-0.5 font-sans font-semibold" data-testid="profile-name">
          {{ user.name }}
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-[10px] uppercase">Email</dt>
        <dd
          class="mt-0.5 truncate font-sans font-semibold"
          data-testid="profile-email"
        >
          {{ user.email }}
        </dd>
      </div>
    </dl>
    <div class="mt-6 flex gap-2">
      <Button variant="outline" data-testid="sign-out" @click="signOut">
        Sign out
      </Button>
      <Button
        variant="destructive"
        data-testid="delete-account-open"
        @click="deleting = true"
      >
        Delete account
      </Button>
    </div>
    <DeleteAccountDialog v-model:open="deleting" />
  </main>
</template>
