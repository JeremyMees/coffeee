<script setup lang="ts">
import {
  CoffeeIcon,
  HeartIcon,
  LibraryIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UserIcon,
} from '@lucide/vue'

const props = defineProps<{
  primary: string
  card: string
  logo: {
    family: string
    weight: number
    tracking: string
    leading: number
    settings?: string
  }
}>()

const wordmark = computed(() => ({
  fontFamily: props.logo.family,
  fontWeight: props.logo.weight,
  letterSpacing: props.logo.tracking,
  lineHeight: props.logo.leading,
  fontVariationSettings: props.logo.settings ?? 'normal',
}))

const cardHeight = 510
const peek = 88

const selected = ref<string>()
const filters = ['All', 'Espresso', 'Filter', 'Omni']
const nav = [
  { label: 'Stock', icon: CoffeeIcon },
  { label: 'Library', icon: LibraryIcon },
  { label: 'Search', icon: SearchIcon },
  { label: 'Profile', icon: UserIcon },
]

function specs(coffee: PrototypeCoffee) {
  return [
    { label: 'Origin', value: coffee.origin },
    { label: 'Process', value: coffee.process },
    { label: 'Varietal', value: coffee.varietal },
    { label: 'Altitude', value: coffee.altitude },
    {
      label: 'Roast',
      value: `${coffee.roastLevel} · ${coffee.roastedFor}`,
    },
    {
      label: 'Freshness',
      value: prototypeFreshness(coffee.daysOffRoast).label,
    },
  ]
}

function toggle(id: string) {
  selected.value = selected.value === id ? undefined : id
}
</script>

<template>
  <div
    class="boo min-h-dvh bg-(--boo-bg) text-(--boo-ink)"
    :style="{ '--boo-ink': props.primary }"
  >
    <div class="lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        class="sticky top-0 hidden h-dvh flex-col border-r border-(--boo-line) lg:flex"
      >
        <div
          class="border-b border-(--boo-line) px-6 pt-8 pb-6 text-[44px] lowercase"
          :style="wordmark"
        >
          cof<br />fee<br />ee
        </div>
        <nav class="boo-mono flex flex-col gap-1 p-3 text-[13px] uppercase">
          <a
            v-for="(item, i) in nav"
            :key="item.label"
            href="#"
            class="flex items-center gap-3 rounded-full px-4 py-2.5"
            :class="
              i === 0
                ? 'bg-(--boo-ink) text-(--boo-bg)'
                : 'hover:bg-(--boo-soft)'
            "
          >
            <component :is="item.icon" class="size-4" />
            {{ item.label }}
          </a>
        </nav>
        <div class="boo-mono mt-auto border-t border-(--boo-line) p-4 text-xs">
          <button
            type="button"
            class="w-full rounded-full border border-(--boo-ink) px-4 py-2 text-left uppercase"
          >
            Home shelf +
          </button>
        </div>
      </aside>

      <main class="pb-36 lg:pb-16">
        <div
          class="boo-mono flex items-center justify-between border-b border-(--boo-line) px-4 pt-16 pb-3 text-[11px] uppercase lg:hidden"
        >
          <span class="text-[30px] normal-case" :style="wordmark">
            coffeee
          </span>
          <span>Home shelf +</span>
        </div>
        <div
          class="boo-mono hidden items-center justify-between border-b border-(--boo-line) px-10 py-3 text-[11px] uppercase lg:flex"
        >
          <span>Home shelf — Stock</span>
        </div>

        <header class="px-4 pt-6 lg:px-10 lg:pt-10">
          <div class="flex items-end justify-between gap-4">
            <h1
              class="boo-sans text-[64px] leading-[0.9] font-semibold tracking-[-0.045em] lg:text-[88px]"
            >
              Stock
            </h1>
            <button
              type="button"
              class="boo-mono hidden items-center gap-2 rounded-full border border-(--boo-ink) px-6 py-2.5 text-sm uppercase hover:bg-(--boo-ink) hover:text-(--boo-bg) lg:flex"
            >
              <PlusIcon class="size-4" />
              Add coffee
            </button>
          </div>
          <p class="boo-mono mt-3 text-xs">4 bags in stock · 1 past peak</p>
          <div class="boo-mono mt-5 flex flex-wrap gap-2 text-[13px]">
            <span
              v-for="(filter, i) in filters"
              :key="filter"
              class="rounded-full px-3.5 py-1.5"
              :class="i === 0 ? 'border border-(--boo-ink)' : ''"
            >
              {{ filter }}
            </span>
          </div>
        </header>

        <div
          class="mt-8 px-4 lg:grid lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-12 lg:px-10"
        >
          <section aria-label="In stock">
            <button
              v-for="(coffee, i) in prototypeStock"
              :key="coffee.id"
              type="button"
              class="relative flex w-full flex-col rounded-[28px] p-5 text-left text-(--boo-card-text) shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.35)] transition-[margin] duration-500 ease-(--ease-expo-out)"
              :style="{
                background: coffee.ink,
                height: `${cardHeight}px`,
                marginTop: prototypeStackGap(
                  i,
                  selected,
                  prototypeStock,
                  cardHeight,
                  peek,
                ),
              }"
              @click="toggle(coffee.id)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="boo-mono text-[11px] uppercase opacity-80">
                    {{ coffee.roaster }}
                  </p>
                  <p
                    class="boo-sans truncate text-[26px] leading-tight font-semibold tracking-[-0.03em]"
                  >
                    {{ coffee.name }}
                  </p>
                </div>
                <div class="text-right">
                  <p
                    class="boo-sans text-[44px] leading-none font-semibold tracking-[-0.05em]"
                  >
                    {{ coffee.daysOffRoast }}
                  </p>
                  <p class="boo-mono text-[9px] whitespace-nowrap uppercase">
                    days off roast
                  </p>
                </div>
              </div>

              <template v-if="card === 'A' || card === 'D'">
                <p class="boo-mono mt-6 text-[10px] uppercase opacity-75">
                  Flavor notes
                </p>
                <ul class="mt-2 flex flex-col gap-1.5">
                  <li
                    v-for="note in coffee.notes"
                    :key="note.label"
                    class="boo-sans flex items-center gap-3 text-[26px] leading-[1.05] font-semibold tracking-[-0.03em]"
                  >
                    <span
                      v-if="card === 'D'"
                      class="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-[18px]"
                    >
                      {{ note.emoji }}
                    </span>
                    {{ note.label }}
                  </li>
                </ul>
                <dl class="mt-auto flex flex-col pt-4">
                  <div
                    v-for="row in specs(coffee)"
                    :key="row.label"
                    class="flex items-baseline justify-between gap-4 border-t border-white/25 py-2"
                  >
                    <dt class="boo-mono text-[11px] uppercase opacity-75">
                      {{ row.label }}
                    </dt>
                    <dd
                      class="boo-sans truncate text-right text-[15px] font-medium"
                    >
                      {{ row.value }}
                    </dd>
                  </div>
                </dl>
              </template>

              <template v-else-if="card === 'B'">
                <p class="boo-mono mt-6 text-[10px] uppercase opacity-75">
                  Flavor notes
                </p>
                <ul class="mt-2.5 flex flex-wrap gap-2">
                  <li
                    v-for="note in coffee.notes"
                    :key="note.label"
                    class="boo-sans rounded-full bg-white/20 px-4 py-2 text-[17px] font-semibold tracking-[-0.01em]"
                  >
                    {{ note.emoji }} {{ note.label }}
                  </li>
                </ul>
                <dl class="mt-auto grid grid-cols-2 gap-x-4 gap-y-4">
                  <div v-for="row in specs(coffee)" :key="row.label">
                    <dt class="boo-mono text-[10px] uppercase opacity-75">
                      {{ row.label }}
                    </dt>
                    <dd
                      class="boo-sans mt-0.5 text-[17px] leading-tight font-semibold tracking-[-0.01em]"
                    >
                      {{ row.value }}
                    </dd>
                  </div>
                </dl>
              </template>

              <template v-else>
                <p class="boo-mono mt-6 text-[10px] uppercase opacity-75">
                  Tastes like
                </p>
                <p class="boo-serif mt-1 text-[40px] leading-[0.95]">
                  {{ coffee.notes.map(n => n.label).join(', ') }}
                </p>
                <dl
                  class="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 rounded-[18px] bg-(--boo-bg) p-4 text-[#1d1a17]"
                >
                  <div v-for="row in specs(coffee)" :key="row.label">
                    <dt
                      class="boo-mono text-[10px] uppercase"
                      :style="{ color: coffee.ink }"
                    >
                      {{ row.label }}
                    </dt>
                    <dd
                      class="boo-sans mt-0.5 text-[15px] leading-tight font-semibold"
                    >
                      {{ row.value }}
                    </dd>
                  </div>
                </dl>
              </template>
            </button>
          </section>

          <section class="mt-14 lg:mt-0">
            <h2
              class="boo-sans text-center text-[40px] leading-none font-semibold tracking-[-0.04em] lg:text-left lg:text-[52px]"
            >
              Bought before
            </h2>
            <div
              class="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0"
            >
              <article
                v-for="coffee in prototypeBoughtBefore"
                :key="coffee.id"
                class="w-40 shrink-0 snap-start lg:w-auto"
              >
                <div
                  class="relative grid aspect-square place-items-center rounded-[22px] p-4 text-center text-(--boo-card-text)"
                  :style="{ background: coffee.ink }"
                >
                  <span
                    class="boo-mono absolute top-3 left-3 rounded-full bg-(--boo-card-text) px-2 py-0.5 text-[9px] uppercase"
                    :style="{ color: coffee.ink }"
                  >
                    {{ coffee.roastedFor }}
                  </span>
                  <HeartIcon
                    v-if="coffee.favourite"
                    class="absolute top-3 right-3 size-4 fill-current"
                  />
                  <span class="boo-serif text-[30px] leading-[0.95]">
                    {{ coffee.name }}
                  </span>
                  <span
                    class="boo-mono absolute bottom-3 left-3 flex items-center gap-0.5 text-[10px]"
                  >
                    <StarIcon class="size-3 fill-current" />
                    {{ coffee.rating }}
                  </span>
                </div>
                <div
                  class="boo-mono mt-2 flex justify-between gap-2 text-[11px] leading-snug"
                >
                  <span class="min-w-0">
                    <span class="block truncate">{{ coffee.name }}</span>
                    <span class="block truncate opacity-70">
                      {{ coffee.roaster }}
                    </span>
                  </span>
                  <span>{{ coffee.timesBought }}×</span>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex w-fit items-center gap-1 rounded-full border border-(--boo-ink) bg-(--boo-bg)/90 p-1.5 backdrop-blur-md lg:hidden"
    >
      <a
        v-for="(item, i) in nav"
        :key="item.label"
        href="#"
        :aria-label="item.label"
        class="grid size-12 place-items-center rounded-full"
        :class="i === 0 ? 'bg-(--boo-ink) text-(--boo-bg)' : ''"
      >
        <component :is="item.icon" class="size-5" />
      </a>
      <span class="mx-1 h-7 w-px bg-(--boo-line)" />
      <button
        type="button"
        aria-label="Add coffee"
        class="grid size-12 place-items-center rounded-full border border-(--boo-ink)"
      >
        <PlusIcon class="size-5" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
.boo {
  --boo-bg: #fffaf5;
  --boo-line: color-mix(in oklab, var(--boo-ink) 35%, transparent);
  --boo-soft: color-mix(in oklab, var(--boo-ink) 10%, transparent);
  --boo-card-text: #fffaf5;
  color-scheme: light;
  font-family: 'Space Mono', monospace;
}

.boo-sans {
  font-family: Inter, sans-serif;
}

.boo-mono {
  font-family: 'Space Mono', monospace;
}

.boo-serif {
  font-family: 'Instrument Serif', serif;
}
</style>
