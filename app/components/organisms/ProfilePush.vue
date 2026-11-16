<script setup lang="ts">
import { BellOffIcon, InfoIcon, SmartphoneIcon } from '@lucide/vue'

const { state, busy, settingsPlace, turnOn, turnOff } = usePush()

const unblockSteps: Record<NotificationSettingsPlace, string> = {
  iPhoneApp:
    'Open Settings on your iPhone, tap Notifications, then Coffeee, and turn on Allow Notifications.',
  androidApp:
    'Press and hold the Coffeee icon, tap App info, then Notifications, and turn them on.',
  chromium:
    'Click the icon left of the web address, then set Notifications to Allow.',
  firefox:
    'Click the icon left of the web address and clear Blocked next to Send notifications.',
  safari:
    'Open Safari Settings, go to Websites, then Notifications, and set Coffeee to Allow.',
  other: 'Allow notifications for Coffeee in your browser settings.',
}
const saveError = ref('')

const usable = computed(() => state.value === 'on' || state.value === 'off')

async function toggle(on: boolean) {
  saveError.value = ''

  try {
    await (on ? turnOn() : turnOff())
  } catch (caught) {
    console.error('Could not change push', caught)
    saveError.value = on
      ? "Push couldn't be turned on. Try again."
      : "Push couldn't be turned off. Try again."
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h2 class="text-[28px]">Push</h2>
      <p class="mt-1 text-xs">
        Get a push on this device for the notifications you choose below.
      </p>
    </div>
    <div
      class="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3"
    >
      <label for="push-this-device" class="font-sans font-semibold">
        Push on this device
      </label>
      <Switch
        id="push-this-device"
        data-testid="push-switch"
        :model-value="state === 'on'"
        :disabled="!usable || busy"
        @update:model-value="toggle"
      />
    </div>
    <Notice
      v-if="state === 'needsInstall'"
      title="Add Coffeee to your Home Screen"
      :icon="SmartphoneIcon"
      testid="push-needs-install"
    >
      On iPhone, push works once Coffeee is on your Home Screen.
      <template #action><InstallAction /></template>
    </Notice>
    <Notice
      v-else-if="state === 'blocked'"
      title="Push is blocked"
      tone="warning"
      :icon="BellOffIcon"
      testid="push-blocked"
    >
      {{ unblockSteps[settingsPlace] }} Then come back and turn on the switch.
    </Notice>
    <Notice
      v-else-if="state === 'unsupported'"
      title="No push in this browser"
      :icon="InfoIcon"
      testid="push-unsupported"
    >
      This browser can't receive push. Email still works.
    </Notice>
    <Alert v-if="saveError" variant="destructive" data-testid="push-error">
      <AlertDescription>{{ saveError }}</AlertDescription>
    </Alert>
  </section>
</template>
