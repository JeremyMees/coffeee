<script setup lang="ts">
const origin = useRequestURL().origin

useSeoMeta({
  ogType: 'website',
  ogSiteName: 'Coffeee',
  ogTitle: 'Coffeee',
  ogDescription: 'Your coffee shelf, and every coffee you ever bought.',
  ogImage: {
    url: `${origin}/og-image.png`,
    type: 'image/png',
    width: 1200,
    height: 630,
    alt: 'Coffeee: your coffee shelf, and every coffee you ever bought.',
  },
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtPwaManifest />
  <NuxtLoadingIndicator color="var(--primary)" />
  <NuxtRouteAnnouncer />
  <ConsentRoot />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
