<script setup lang="ts">
import { CoffeeIcon, PlusIcon, StoreIcon } from '@lucide/vue'

const destinations = useDestinations()
const activeSection = useActiveSection()
const addCoffee = useAddCoffee()
const addRoaster = useAddRoaster()
</script>

<template>
  <nav
    aria-label="Dock"
    data-testid="dock"
    class="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] [view-transition-name:dock] lg:hidden"
  >
    <Dock
      class="mt-0 h-auto gap-1 rounded-full max-[360px]:gap-0 border-primary bg-material p-1.5"
      :magnification="20"
      :distance="80"
    >
      <DockIcon v-for="item in destinations" :key="item.to">
        <NuxtLink
          v-slot="{ href, navigate, isExactActive }"
          :to="item.to"
          custom
        >
          <a
            :href="href ?? undefined"
            :aria-label="item.label"
            data-testid="dock-link"
            :title="item.label"
            :aria-current="isExactActive ? 'page' : undefined"
            class="grid size-full place-items-center rounded-full"
            :class="{
              'bg-primary text-primary-foreground': item.to === activeSection,
            }"
            @click="navigate"
          >
            <component :is="item.icon" class="size-5" aria-hidden="true" />
          </a>
        </NuxtLink>
      </DockIcon>
      <DockSeparator class="mx-1 h-7 max-[360px]:mx-0.5 w-px bg-border" />
      <DockIcon>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              aria-label="Add"
              data-testid="dock-add"
              title="Add"
              class="grid size-full place-items-center rounded-full border border-primary data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
            >
              <PlusIcon class="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            :side-offset="12"
            data-testid="dock-add-menu"
            class="w-auto min-w-48 rounded-[22px] p-1.5 font-mono ring-primary"
          >
            <DropdownMenuItem
              data-testid="dock-add-coffee"
              class="min-h-11 rounded-full px-4 text-[13px] uppercase"
              @select="addCoffee = true"
            >
              <CoffeeIcon aria-hidden="true" />
              Add coffee
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="dock-add-roaster"
              class="min-h-11 rounded-full px-4 text-[13px] uppercase"
              @select="addRoaster = true"
            >
              <StoreIcon aria-hidden="true" />
              Add roaster
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DockIcon>
    </Dock>
  </nav>
</template>
