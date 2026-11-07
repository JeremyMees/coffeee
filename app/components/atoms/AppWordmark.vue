<script setup lang="ts">
defineProps<{ stacked?: boolean }>()
</script>

<template>
  <span
    data-testid="wordmark"
    class="inline-block font-sans leading-[0.82] font-bold tracking-[-0.06em] lowercase"
  >
    <template v-if="stacked">cof<br />fee<br />e</template>
    <template v-else>coffeee</template>
  </span>
</template>
