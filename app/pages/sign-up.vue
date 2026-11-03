<script setup lang="ts">
definePageMeta({ layout: false })

useHead({ title: 'Create an account · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold" data-testid="sign-up-title">
            Create an account
          </h1>
        </CardTitle>
        <CardDescription>
          Use the email address you were invited with. We'll email you a link to
          confirm it.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <PasswordSignUpForm />
        <p class="border-t pt-4 text-center text-xs">
          Already have an account?
          <NuxtLink
            to="/sign-in"
            class="underline underline-offset-4"
            data-testid="sign-up-sign-in"
          >
            Sign in
          </NuxtLink>
        </p>
      </CardContent>
    </Card>
  </main>
</template>
