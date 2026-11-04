<script setup lang="ts">
const route = useRoute('shelves-shelfId-settings')
const shelfId = computed(() => idFrom(route.params.shelfId))
const tab = useTab(['shelf', 'members', 'grinders'])

useHead({ title: 'Shelf settings · Coffeee' })
</script>

<template>
  <main class="max-w-2xl">
    <PageHeader title="Settings" />
    <p class="mt-3 text-xs">Everything this shelf keeps for all its members.</p>
    <Tabs v-model="tab" class="mt-8" :unmount-on-hide="false">
      <TabsList>
        <TabsTrigger value="shelf" data-testid="settings-tab-shelf">
          Shelf
        </TabsTrigger>
        <TabsTrigger value="members" data-testid="settings-tab-members">
          Members
        </TabsTrigger>
        <TabsTrigger value="grinders" data-testid="settings-tab-grinders">
          Grinders
        </TabsTrigger>
      </TabsList>
      <TabsContent value="shelf" class="mt-6">
        <ShelfName :key="shelfId" :shelf-id="shelfId" />
        <ShelfLeave class="mt-12" :shelf-id="shelfId" />
      </TabsContent>
      <TabsContent value="members" class="mt-6">
        <ShelfMembers :shelf-id="shelfId" />
        <ShelfInvites class="mt-12" :shelf-id="shelfId" />
      </TabsContent>
      <TabsContent value="grinders" class="mt-6">
        <ShelfGrinders :shelf-id="shelfId" />
      </TabsContent>
    </Tabs>
  </main>
</template>
