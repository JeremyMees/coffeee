<script setup lang="ts">
definePageMeta({
  middleware: to => {
    const link = sharedLink(to.query.url, to.query.text, to.query.title)

    return navigateTo(
      link ? { path: '/', query: { add: 'coffee', link } } : '/',
      { replace: true },
    )
  },
})
</script>

<template>
  <main />
</template>
