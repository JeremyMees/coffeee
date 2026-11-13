<script setup lang="ts">
const { offered } = useInstall()
</script>

<template>
  <section
    v-if="offered"
    data-testid="profile-install"
    class="flex flex-col gap-4"
  >
    <div>
      <h2 class="text-[28px]">Install Coffeee</h2>
      <p class="mt-1 text-xs">
        Put Coffeee on your home screen and open your shelf in one tap.
      </p>
    </div>
    <InstallAction />
  </section>
</template>
