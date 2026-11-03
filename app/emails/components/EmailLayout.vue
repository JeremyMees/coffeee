<script setup lang="ts">
defineProps<{ title: string; preview: string; heading: string }>()
</script>

<template>
  <Html>
    <Head>
      <title>{{ title }}</title>
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
      <style>
        @import '@maizzle/tailwindcss';

        @theme {
          --color-background: #fffaf5;
          --color-foreground: #1f4fd8;
          --color-primary: #1f4fd8;
          --color-primary-foreground: #fffaf5;
          --color-border: #b3c3f1;
          --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
          --font-mono: 'Space Mono', ui-monospace, monospace;
        }
      </style>
    </Head>
    <Body class="m-0 bg-background font-mono text-foreground">
      <Preheader>{{ preview }}</Preheader>
      <Container class="my-10 max-w-[560px] px-4">
        <Section class="rounded-2xl border border-solid border-border p-8">
          <Text
            class="m-0 font-sans text-[28px]/7 font-bold tracking-[-0.06em] lowercase"
          >
            coffeee
          </Text>
          <Heading
            class="mt-10 mb-6 font-sans text-[32px]/8 font-semibold tracking-[-0.045em]"
          >
            {{ heading }}
          </Heading>
          <Section>
            <slot />
          </Section>
          <Hr class="my-8 border-border" />
          <Text class="m-0 text-xs">
            Your coffee shelf, and every coffee you ever bought.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
</template>
