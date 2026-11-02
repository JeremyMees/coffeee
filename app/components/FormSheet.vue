<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

defineProps<{ title: string; description: string }>()

const open = defineModel<boolean>('open', { default: false })
const desktop = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      :side="desktop ? 'right' : 'bottom'"
      class="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-primary bg-background font-mono lg:max-h-none lg:max-w-md! lg:rounded-none"
    >
      <SheetHeader class="px-5 pt-6 lg:px-8 lg:pt-10">
        <SheetTitle
          class="font-sans text-[40px] leading-[0.9] font-semibold tracking-[-0.045em] text-primary"
        >
          {{ title }}
        </SheetTitle>
        <SheetDescription class="text-xs text-primary">
          {{ description }}
        </SheetDescription>
      </SheetHeader>

      <slot />
    </SheetContent>
  </Sheet>
</template>
