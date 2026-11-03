<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { DialogClose } from 'reka-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineOptions({ inheritAttrs: false })

defineProps<{ title: string; description: string }>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      v-bind="$attrs"
      :show-close-button="false"
      class="block gap-0 rounded-[28px] border border-primary bg-background p-8 font-mono ring-0 sm:max-w-md"
    >
      <DialogHeader class="gap-1.5 pr-6 text-left">
        <DialogTitle
          data-testid="action-dialog-title"
          class="font-sans text-[32px] leading-[0.95] font-semibold tracking-[-0.045em] wrap-break-word text-primary"
        >
          {{ title }}
        </DialogTitle>
        <DialogDescription
          data-testid="action-dialog-description"
          class="text-xs text-primary"
        >
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="mt-6">
        <slot />
      </div>
      <DialogClose
        data-testid="action-dialog-close"
        class="absolute top-4 right-4 rounded-full p-2 text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </Dialog>
</template>
