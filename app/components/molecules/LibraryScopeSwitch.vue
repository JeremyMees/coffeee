<script setup lang="ts">
const scope = defineModel<LibraryScope>({ required: true })
</script>

<template>
  <div
    class="inline-flex rounded-full bg-accent p-1"
    role="group"
    aria-label="Show"
    data-testid="library-scope"
  >
    <button
      v-for="option in libraryScopes"
      :key="option"
      type="button"
      :data-testid="`library-scope-${option}`"
      :aria-pressed="scope === option"
      :class="[
        'rounded-full px-5 py-3 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:py-2',
        scope === option
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-background',
      ]"
      @click="scope = option"
    >
      {{ libraryScopeLabels[option] }}
    </button>
  </div>
</template>
