import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Window as HappyWindow } from 'happy-dom'
import { vi } from 'vitest'
import { defineComponent } from 'vue'
import type { CurrentUser } from '~/composables/useCurrentUser'
import { localDate, useRouter } from '#imports'

export function testUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'user-1',
    name: 'Sarah',
    email: 'sarah@example.com',
    image: null,
    role: 'user',
    shelves: [
      { id: 'home', name: "Sarah's shelf", ownerId: 'user-1' },
      { id: 'work', name: 'Work', ownerId: 'user-2' },
    ],
    ...overrides,
  }
}

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
  const input = byTestId<HTMLInputElement>(testId)!
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
