<template>
  <section
    aria-hidden="true"
    class="mt-10"
    data-testid="roaster-details-skeleton"
  >
    <Skeleton class="h-7 w-28" />
    <div class="mt-4 flex items-center gap-4 rounded-[18px] border p-4">
      <Skeleton class="size-16 shrink-0" />
      <div class="flex flex-col gap-2">
        <Skeleton class="h-4 w-36" />
        <Skeleton class="h-3 w-24" />
      </div>
    </div>
  </section>
</template>
