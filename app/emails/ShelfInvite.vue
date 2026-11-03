<template>
  <EmailLayout
    title="You're invited to a shelf on Coffeee"
    preview="Keep one stock of coffee together on Coffeee"
    heading="You're invited"
  >
    <Text class="my-4">
      <strong v-pre>{{ invitedBy }}</strong>
      invited you to their shelf
      <strong v-pre>{{ shelf }}</strong>
      on Coffeee, so you can keep one stock of coffee together.
    </Text>
    <Text class="my-4">
      The link works once and expires in a week. New to Coffeee? You'll get a
      shelf of your own too.
    </Text>
    <EmailButton href="{{ link }}">Join the shelf</EmailButton>
    <Text class="mt-6 mb-0 text-xs">
      Don't know who sent this? You can ignore this email.
    </Text>
  </EmailLayout>
</template>
