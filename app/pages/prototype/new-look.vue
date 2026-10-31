<script setup lang="ts">
const primary = '#1f4fd8'

const logo = {
  family: 'Inter',
  weight: 700,
  tracking: '-0.06em',
  leading: 0.82,
}

const variants = [
  { key: 'A', name: 'List, no emoji' },
  { key: 'B', name: 'Pills, emoji' },
  { key: 'C', name: 'Label panel, no emoji' },
  { key: 'D', name: 'List, emoji' },
]

const route = useRoute()
const variant = computed(
  () => variants.find(v => v.key === route.query.variant) ?? variants[0]!,
)

useHead({
  title: 'Prototype: new look',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: '',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap',
    },
  ],
})
</script>

<template>
  <div>
    <PrototypeNewLookBoo :primary="primary" :card="variant.key" :logo="logo" />
    <PrototypeSwitcher :variants="variants" />
  </div>
</template>
