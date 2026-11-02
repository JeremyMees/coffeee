<script setup lang="ts">
const route = useRoute('shelves-shelfId-settings')
const shelfId = computed(() => route.params.shelfId)

useHead({ title: 'Shelf settings · Coffeee' })
</script>

<template>
  <main class="max-w-2xl">
    <PageHeader title="Settings" />
    <p class="mt-3 text-xs">Everything this shelf keeps for all its members.</p>
    <ShelfGrinders class="mt-8" :shelf-id="shelfId" />
  </main>
</template>
