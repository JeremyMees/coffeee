import { useQueryClient } from '@tanstack/vue-query'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Window as HappyWindow } from 'happy-dom'
import { useForm } from 'vee-validate'
import { vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import {
  coffeeDetailsSchema,
  localDate,
  useNuxtApp,
  useRouter,
  useState,
  zodSchema,
} from '#imports'

export function forgetLastShelf() {
  document.cookie = 'shelf=; max-age=0; path=/'
}

export function rememberShelf(shelfId: string) {
  document.cookie = `shelf=${shelfId}; path=/`
}

export function setViewport(width: number, height: number) {
  ;(window as unknown as HappyWindow).happyDOM.setViewport({ width, height })
}

export function currentPath() {
  return useRouter().currentRoute.value.path
}

export function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)

  return localDate(date)
}

export function tid(...ids: string[]) {
  return ids.map(id => `[data-testid="${id}"]`).join(' ')
}

export function byTestId<Element extends HTMLElement = HTMLElement>(
  ...ids: string[]
) {
  return document.body.querySelector<Element>(tid(...ids))
}

export function allByTestId(...ids: string[]) {
  return [...document.body.querySelectorAll<HTMLElement>(tid(...ids))]
}

export function inputValue(...ids: string[]) {
  return byTestId<HTMLInputElement>(...ids)!.value
}

export function isChecked(...ids: string[]) {
  return byTestId<HTMLInputElement>(...ids)!.checked
}

export async function click(...ids: string[]) {
  byTestId(...ids)!.click()
  await flushPromises()
}

export async function type(testId: string, value: string) {
  const input = await vi.waitFor(() => {
    const found = byTestId<HTMLInputElement>(testId)
    if (!found) throw new Error(`No ${testId} to type in`)
    return found
  })
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

export async function submit(formTestId: string) {
  byTestId(formTestId)!.dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
  await flushPromises()
}

const pickerOption = `${tid('list-option')}, ${tid('list-option-new')}`

export function pickerOptions() {
  return [...document.body.querySelectorAll(pickerOption)].map(element =>
    element.textContent?.trim(),
  )
}

export async function pickOption(text: string) {
  const option = await vi.waitFor(() => {
    const found = [
      ...document.body.querySelectorAll<HTMLElement>(pickerOption),
    ].find(element => element.textContent?.trim() === text)
    if (!found) throw new Error(`No option “${text}”`)

    return found
  }, 3000)
  option.click()
  await flushPromises()
}

export async function pickRoaster(search: string, option: string) {
  await type('coffee-roaster', search)
  await pickOption(option)
}

export function originOptions() {
  return allByTestId('origin-option').map(element =>
    element.textContent?.trim(),
  )
}

export function chipLabels(...within: string[]) {
  return allByTestId(...within, 'chip-label').map(element =>
    element.textContent?.trim(),
  )
}

export async function pickOrigin(search: string, country: string) {
  await type('coffee-origins', search)
  const option = allByTestId('origin-option').find(
    element => element.textContent?.trim() === country,
  )!
  option.click()
  await flushPromises()
}

async function pickFrom(
  testId: string,
  search: string,
  text: string,
  options: string[],
) {
  await type(testId, search)
  const option = await vi.waitFor(() => {
    const found = options
      .flatMap(option => allByTestId(option))
      .find(
        element => element.textContent?.replace(/\s+/g, ' ').trim() === text,
      )
    if (!found) throw new Error(`No option “${text}”`)

    return found
  }, 3000)
  option.click()
  await flushPromises()
}

export function pickScoped(testId: string, search: string, text: string) {
  return pickFrom(testId, search, text, ['scoped-option', 'scoped-option-new'])
}

export function pickMulti(testId: string, search: string, text: string) {
  return pickFrom(testId, search, text, ['multi-option', 'multi-option-new'])
}

export async function mountInForm(
  component: Component,
  initialValues: Record<string, unknown> = {},
) {
  let form!: ReturnType<typeof useForm>

  const Form = defineComponent({
    setup() {
      form = useForm({
        validationSchema: zodSchema(coffeeDetailsSchema),
        initialValues: {
          name: '',
          roaster: '',
          origins: [],
          regions: [],
          farms: [],
          washingStations: [],
          producers: [],
          processes: [],
          varietals: [],
          flavorNotes: [],
          ...initialValues,
        },
      })

      return () => h('form', [h(component)])
    },
  })

  const wrapper = await mountSuspended(Form, { attachTo: document.body })

  return { wrapper, form }
}

export async function pickDate(pickerTestId: string, isoDate: string) {
  await click(pickerTestId, 'date-picker-trigger')

  const calendar = tid('date-picker-calendar')
  const day = () =>
    document.body.querySelector<HTMLElement>(
      `${calendar} [data-value="${isoDate}"]:not([data-outside-view])`,
    )

  for (let page = 0; !day() && page < 24; page++) {
    document.body
      .querySelector<HTMLElement>(
        `${calendar} [data-slot="calendar-prev-button"]`,
      )!
      .click()
    await flushPromises()
  }

  day()!.click()
  await flushPromises()
}

export function isFetching(queryKey: readonly unknown[]) {
  const client = useNuxtApp().vueApp.runWithContext(() => useQueryClient())

  return client.isFetching({ queryKey }) > 0
}

export async function runOn<T>(route: string, use: () => T) {
  let result!: T

  await mountSuspended(
    defineComponent({
      setup() {
        result = use()

        return () => null
      },
    }),
    { route },
  )

  return result
}

export async function logoBlob() {
  const { default: sharp } = await import('sharp')
  const logo = await sharp({
    create: { width: 40, height: 20, channels: 3, background: '#e4572e' },
  })
    .webp()
    .toBuffer()

  return new Blob([new Uint8Array(logo)], { type: 'image/webp' })
}

export function pickFile(
  testId: string,
  file = new File(['bag'], 'bag.png', { type: 'image/png' }),
) {
  const input = byTestId<HTMLInputElement>(testId)!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export const devices = {
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  desktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  firefox:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

export function onDevice(device: keyof typeof devices) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(devices[device])
}

export function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(
    new Event('beforeinstallprompt', { cancelable: true }),
    {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome }),
    },
  )
  window.dispatchEvent(event)

  return event
}

export function runInstalled() {
  useNuxtApp().$pwa!.isPWAInstalled = true
}

export function forgetInstall() {
  const pwa = useNuxtApp().$pwa!
  pwa.showInstallPrompt = false
  pwa.isPWAInstalled = false
  localStorage.clear()
}

export const deviceEndpoint = 'https://push.example.com/this-device'

export function fakePushDevice(
  options: {
    permission?: NotificationPermission
    answer?: NotificationPermission
    subscribed?: boolean
    withoutWorker?: boolean
  } = {},
) {
  let permission = options.permission ?? 'default'

  function subscription() {
    return {
      endpoint: deviceEndpoint,
      toJSON: () => ({
        endpoint: deviceEndpoint,
        expirationTime: null,
        keys: { p256dh: 'device-p256dh', auth: 'device-auth' },
      }),
      unsubscribe: vi.fn(async () => {
        device.subscription = null

        return true
      }),
    }
  }

  const permissionStatus = new EventTarget()

  const device = {
    subscription: options.subscribed ? subscription() : null,
    allowInBrowser() {
      permission = 'granted'
      permissionStatus.dispatchEvent(new Event('change'))
    },
    allowWhileAway() {
      permission = 'granted'
    },
    requestPermission: vi.fn(async () => {
      permission = options.answer ?? 'granted'

      return permission
    }),
    subscribe: vi.fn(async () => {
      device.subscription = subscription()

      return device.subscription
    }),
  }
  const registration = {
    pushManager: {
      getSubscription: async () => device.subscription,
      subscribe: device.subscribe,
    },
  }

  vi.stubGlobal('PushManager', function PushManager() {})
  vi.stubGlobal('Notification', {
    get permission() {
      return permission
    },
    requestPermission: device.requestPermission,
  })
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: async () => permissionStatus },
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: async () =>
        options.withoutWorker ? undefined : registration,
      ready: options.withoutWorker
        ? new Promise(() => {})
        : Promise.resolve(registration),
    },
  })

  return device
}

export function forgetPushDevice() {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
  Reflect.deleteProperty(navigator, 'permissions')
  useState('push-permission').value = null
  useState('push-subscribed').value = null
  useState('push-busy').value = false
  localStorage.clear()
}
