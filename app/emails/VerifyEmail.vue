<template>
  <EmailLayout
    title="Confirm your email for Coffeee"
    preview="Confirm your email to start your coffee shelf"
    heading="Confirm your email"
  >
    <Text class="my-4">
      Hi <span v-pre>{{ name }}</span
      >,
    </Text>
    <Text class="my-4">
      Confirm this is your email address and you're signed in to Coffeee. The
      link works for one hour.
    </Text>
    <EmailButton href="{{ link }}">Confirm email</EmailButton>
    <Text class="mt-6 mb-0 text-xs">
      Didn't sign up for Coffeee? You can ignore this email.
    </Text>
  </EmailLayout>
</template>
