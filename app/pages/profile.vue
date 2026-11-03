<script setup lang="ts">
const user = useCurrentUser()
const deleting = ref(false)
const tab = useTab(['account', 'notifications', 'danger'])

useHead({ title: 'Profile · Coffeee' })
</script>

<template>
  <main>
    <PageHeader title="Profile" />
    <Tabs v-model="tab" class="mt-8 max-w-md" :unmount-on-hide="false">
      <TabsList>
        <TabsTrigger value="account" data-testid="profile-tab-account">
          Account
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          data-testid="profile-tab-notifications"
        >
          Notifications
        </TabsTrigger>
        <TabsTrigger value="danger" data-testid="profile-tab-danger">
          Danger zone
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account" class="mt-6">
        <dl
          v-if="user"
          class="grid gap-x-4 gap-y-3 rounded-[18px] border p-4 sm:grid-cols-2"
        >
          <div>
            <dt class="text-[10px] uppercase">Name</dt>
            <dd
              class="mt-0.5 font-sans font-semibold"
              data-testid="profile-name"
            >
              {{ user.name }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-[10px] uppercase">Email</dt>
            <dd
              class="mt-0.5 truncate font-sans font-semibold"
              data-testid="profile-email"
            >
              {{ user.email }}
            </dd>
          </div>
        </dl>
        <ProfileName class="mt-8" />
        <ProfileStats class="mt-12" />
        <Button
          class="mt-12"
          variant="outline"
          data-testid="sign-out"
          @click="signOut"
        >
          Sign out
        </Button>
      </TabsContent>
      <TabsContent value="notifications" class="mt-6">
        <ProfileNotificationEmails />
      </TabsContent>
      <TabsContent value="danger" class="mt-6">
        <section class="flex flex-col items-start gap-4">
          <div>
            <h2 class="text-[28px]">Delete account</h2>
            <p class="mt-1 text-xs">
              Your ratings, verdicts and grind settings go with it. A shelf you
              share is handed to another member first.
            </p>
          </div>
          <Button
            variant="destructive"
            data-testid="delete-account-open"
            @click="deleting = true"
          >
            Delete account
          </Button>
        </section>
      </TabsContent>
    </Tabs>
    <DeleteAccountDialog v-model:open="deleting" />
  </main>
</template>
