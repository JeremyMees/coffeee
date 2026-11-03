<template>
  <EmailLayout
    title="News from your shelf on Coffeee"
    preview="{{ text }}"
    heading="On your shelf"
  >
    <Text class="my-4">
      <strong v-pre>{{ text }}</strong>
    </Text>
    <EmailButton href="{{ link }}">Open the shelf</EmailButton>
    <EmailSettingsLink />
  </EmailLayout>
</template>
