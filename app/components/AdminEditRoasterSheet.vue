<script setup lang="ts">
import { useRoaster } from '~/queries/roasters'

const props = defineProps<{ roasterId: string }>()

const open = defineModel<boolean>('open', { default: false })
const { data: roaster } = useRoaster(() => props.roasterId)
</script>

<template>
  <EditRoasterSheet v-if="roaster" v-model:open="open" :roaster="roaster" />
</template>
