<script setup lang="ts">
const props = defineProps<{ settings: OtherGrindSetting[] }>()

const groups = computed(() => groupedByGrinder(props.settings))
</script>

<template>
  <section
    v-if="settings.length"
    class="mt-6 flex flex-col gap-4"
    data-testid="other-grind-settings"
  >
    <h3 class="text-xs uppercase">From others</h3>
    <div
      v-for="group in groups"
      :key="group[0]!.grinderId"
      class="rounded-[18px] border text-xs"
      :data-testid="`other-grind-grinder-${group[0]!.grinderId}`"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 p-4 pb-2">
        <span class="font-semibold">{{ grinderName(group[0]!) }}</span>
        <span
          v-if="group[0]!.ownedByShelf"
          class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] text-primary-foreground uppercase"
          data-testid="other-grind-owned"
        >
          On this shelf
        </span>
      </div>
      <ul class="divide-y">
        <li
          v-for="setting in group"
          :key="`${setting.userId}:${setting.brewMethodId}`"
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          data-testid="other-grind-setting"
        >
          <span>{{ setting.brewMethod }} · {{ setting.name }}</span>
          <strong
            class="font-sans text-sm font-semibold"
            data-testid="other-grind-setting-value"
          >
            {{ setting.setting }}
          </strong>
        </li>
      </ul>
    </div>
  </section>
</template>
