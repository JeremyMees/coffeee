<script setup lang="ts">
const user = useCurrentUser()
</script>

<template>
  <main
    class="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <h1 class="text-5xl font-bold">Coffeee</h1>
    <p class="max-w-sm text-lg text-muted-foreground">
      Your coffee shelf, and every coffee you ever bought.
    </p>
    <p v-if="user" class="text-sm text-muted-foreground">
      Signed in as {{ user.name }}
    </p>
    <div class="flex gap-2">
      <Button v-if="user?.role === 'admin'" variant="outline" as-child>
        <NuxtLink to="/admin/invites">Invites</NuxtLink>
      </Button>
      <Button variant="outline" @click="signOut">Sign out</Button>
    </div>
  </main>
</template>
