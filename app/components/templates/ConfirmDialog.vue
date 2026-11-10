<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

defineOptions({ inheritAttrs: false })

defineProps<{
  title: string
  description: string
  confirm: string
  error?: string
  pending?: boolean
}>()

defineEmits<{ confirm: [] }>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent
      v-bind="$attrs"
      class="gap-0 rounded-[28px] border border-primary bg-background p-8 font-mono ring-0 sm:max-w-md"
    >
      <AlertDialogHeader class="gap-1.5">
        <AlertDialogTitle
          data-testid="confirm-dialog-title"
          class="font-sans text-[32px] leading-[0.95] font-semibold tracking-[-0.045em] break-words text-primary"
        >
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription
          data-testid="confirm-dialog-description"
          class="text-xs text-primary"
        >
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <slot />
      <Alert
        v-if="error"
        variant="destructive"
        class="mt-6"
        data-testid="form-error"
      >
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
      <AlertDialogFooter
        class="mx-0 mt-6 mb-0 rounded-none border-0 bg-transparent p-0"
      >
        <AlertDialogCancel size="pill" data-testid="confirm-dialog-cancel">
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          size="pill"
          data-testid="confirm-dialog-confirm"
          :disabled="pending"
          @click="$emit('confirm')"
        >
          {{ confirm }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
