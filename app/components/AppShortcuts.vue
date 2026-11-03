<script setup lang="ts">
import { KeyboardIcon, XIcon } from '@lucide/vue'
import { DialogClose } from 'reka-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const apple = ref(true)

onMounted(() => {
  apple.value = isApplePlatform(navigator.platform)
})

const list = computed(() => shortcuts(apple.value))
</script>

<template>
  <Dialog>
    <DialogTrigger
      data-testid="shortcuts-open"
      class="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[13px] uppercase hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <KeyboardIcon class="size-4" aria-hidden="true" />
      Shortcuts
    </DialogTrigger>
    <DialogContent
      :show-close-button="false"
      data-testid="shortcuts"
      class="block gap-0 rounded-[28px] border border-primary bg-background p-8 font-mono ring-0 sm:max-w-md"
    >
      <DialogHeader class="gap-1.5 text-left">
        <DialogTitle
          class="font-sans text-[40px] leading-[0.9] font-semibold tracking-[-0.045em] text-primary"
        >
          Shortcuts
        </DialogTitle>
        <DialogDescription class="text-xs text-primary">
          Keys that work anywhere in the app on a desktop.
        </DialogDescription>
      </DialogHeader>
      <dl class="mt-6 divide-y border-y text-sm text-primary">
        <div
          v-for="shortcut in list"
          :key="shortcut.label"
          class="flex items-center justify-between gap-4 py-3"
          data-testid="shortcut"
        >
          <dt data-testid="shortcut-label">{{ shortcut.label }}</dt>
          <dd class="flex gap-1" data-testid="shortcut-keys">
            <kbd
              v-for="key in shortcut.keys"
              :key="key"
              class="min-w-7 rounded-md border border-primary px-1.5 py-0.5 text-center text-xs"
            >
              {{ key }}
            </kbd>
          </dd>
        </div>
      </dl>
      <DialogClose
        data-testid="shortcuts-close"
        class="absolute top-4 right-4 rounded-full p-2 text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </Dialog>
</template>
