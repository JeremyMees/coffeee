<script setup lang="ts">
const { phone, offered } = useInstall()
</script>

<template>
  <DismissibleBanner
    title="Put Coffeee on your home screen"
    text="Open your shelf in one tap, like any app."
    storage-key="install-banner-dismissed"
    testid="install-banner"
    :show="phone && offered"
  >
    <InstallAction />
  </DismissibleBanner>
</template>
