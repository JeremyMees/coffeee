<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo(lastShelfPath(), { replace: true }),
})
</script>

<template>
  <main />
</template>
