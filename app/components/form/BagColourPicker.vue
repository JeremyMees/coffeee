<script setup lang="ts">
const model = defineModel<string>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <label
      v-for="colour in bagColours"
      :key="colour"
      class="size-9 cursor-pointer rounded-full ring-offset-2 ring-offset-background has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
      :style="{ backgroundColor: colour }"
      :title="bagColourNames[colour]"
    >
      <input
        type="radio"
        name="colour"
        class="sr-only"
        :value="colour"
        :checked="model === colour"
        :aria-label="bagColourNames[colour]"
        :data-testid="`colour-${bagColourNames[colour].toLowerCase()}`"
        @change="model = colour"
      />
    </label>
  </div>
</template>
