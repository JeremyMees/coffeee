<script setup lang="ts">
import { ShieldIcon } from '@lucide/vue'
import { buttonVariants } from '@/components/ui/button'

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
        <ProfileName />
        <dl v-if="user" class="mt-6">
          <dt class="text-[10px] uppercase">Email</dt>
          <dd
            class="mt-0.5 truncate font-sans font-semibold"
            data-testid="profile-email"
          >
            {{ user.email }}
          </dd>
        </dl>
        <ProfileStats class="mt-12" />
        <div class="mt-12 flex flex-wrap gap-3">
          <NuxtLink
            v-if="user?.role === 'admin'"
            :to="adminPath"
            data-testid="profile-admin"
            :class="buttonVariants({ variant: 'outline', class: 'lg:hidden' })"
          >
            <ShieldIcon aria-hidden="true" />
            Admin
          </NuxtLink>
          <Button variant="outline" data-testid="sign-out" @click="signOut">
            Sign out
          </Button>
          <ConsentDialogLink :class="buttonVariants({ variant: 'outline' })">
            Privacy settings
          </ConsentDialogLink>
        </div>
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
