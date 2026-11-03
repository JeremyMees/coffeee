<script setup lang="ts">
import { useRoaster } from '~/queries/roasters'

const props = defineProps<{ roasterId: string }>()

const open = defineModel<boolean>('open', { default: false })
const shelf = useCurrentShelf()
const { data: roaster } = useRoaster(() => props.roasterId)
</script>

<template>
  <EditRoasterSheet
    v-if="roaster && shelf"
    v-model:open="open"
    :shelf-id="shelf.id"
    :roaster="roaster"
  />
</template>
