<template>
  <div aria-hidden="true" data-testid="invite-skeleton">
    <div class="flex flex-col gap-2 py-0.5">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-2/3" />
    </div>
    <div class="mt-8 flex flex-col gap-4">
      <Skeleton class="h-10 w-full rounded-full" />
      <Skeleton class="h-10 w-full rounded-full" />
    </div>
  </div>
</template>
