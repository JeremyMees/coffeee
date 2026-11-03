<template>
  <EmailLayout
    title="Reset your Coffeee password"
    preview="Pick a new password for Coffeee"
    heading="Reset your password"
  >
    <Text class="my-4">
      Hi <span v-pre>{{ name }}</span
      >,
    </Text>
    <Text class="my-4">
      Someone asked to reset the password for your Coffeee account. Pick a new
      one with the link below. It works for one hour.
    </Text>
    <EmailButton href="{{ link }}">Pick a new password</EmailButton>
    <Text class="mt-6 mb-0 text-xs">
      Didn't ask for this? You can ignore this email and your password stays the
      same.
    </Text>
  </EmailLayout>
</template>
