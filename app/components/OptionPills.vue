<script setup lang="ts" generic="Value extends string">
const model = defineModel<Value>()

defineProps<{
  name: string
  options: { value: Value; label: string }[]
  invalid?: boolean
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <label
      v-for="option in options"
      :key="option.value"
      class="cursor-pointer rounded-full border border-transparent bg-accent px-4 py-2 text-[12px] uppercase has-checked:border-primary has-checked:bg-transparent has-focus-visible:ring-2 has-focus-visible:ring-ring"
    >
      <input
        v-model="model"
        type="radio"
        class="sr-only"
        :name="name"
        :value="option.value"
        :data-testid="`option-${option.value}`"
        :aria-invalid="invalid ? true : undefined"
      />
      {{ option.label }}
    </label>
  </div>
</template>
