<template>
  <section
    aria-hidden="true"
    class="mt-8 flex flex-col gap-4"
    data-testid="coffee-verdict-skeleton"
  >
    <div class="flex items-center gap-3">
      <Skeleton class="h-8 w-40" />
      <Skeleton class="h-3 w-16" />
    </div>
    <Skeleton class="h-9 w-44 rounded-full" />
  </section>
</template>
