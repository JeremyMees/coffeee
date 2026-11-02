import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { forgetLastShelf, testUser } from './fixtures'

const server = vi.hoisted(() => ({ requests: [] as string[] }))

registerEndpoint('/api/shelves', {
  method: 'POST',
  handler: async event => {
    const { name } = await readBody(event)
    server.requests.push(name)

    if (name === 'Broken') {
      throw createError({
        statusCode: 409,
        statusMessage: 'That shelf could not be made',
      })
    }

    return { id: 'garage', name, ownerId: 'user-1' }
  },
})

beforeEach(() => {
  forgetLastShelf()
  clearError()
  useCurrentUser().value = testUser()
})

function currentPath() {
  return useRouter().currentRoute.value.path
}

async function openSwitcher(page: Awaited<ReturnType<typeof mountSuspended>>) {
  await page
    .get('aside button[aria-haspopup="menu"]')
    .trigger('keydown', { key: 'Enter' })
  await flushPromises()

  return document.body.querySelector('[role="menu"]')!
}

describe('opening the app', () => {
  it('goes to the first shelf the first time', async () => {
    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/home')
  })

  it('goes back to the last shelf used', async () => {
    await mountSuspended(App, { route: '/shelves/work/library' })

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/work')
  })

  it('goes to the first shelf when the last one is gone', async () => {
    document.cookie = 'shelf=left; path=/'

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/home')
  })

  it('asks for a shelf when there is none', async () => {
    useCurrentUser().value = testUser({ shelves: [] })

    await mountSuspended(App, { route: '/' })

    expect(currentPath()).toBe('/shelves/new')
  })
})

describe('a shelf someone is not a member of', () => {
  it('is not found', async () => {
    await mountSuspended(App, { route: '/shelves/someone-else' }).catch(
      () => {},
    )

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })
})

describe('the app shell on a shelf', () => {
  it.each(['Dock', 'Sidebar'])(
    'links the %s to the pages of the current shelf',
    async name => {
      const page = await mountSuspended(App, { route: '/shelves/work/search' })
      const nav = page.get(`nav[aria-label="${name}"]`)

      expect(nav.find('a[href="/shelves/work"]').exists()).toBe(true)
      expect(nav.find('a[href="/shelves/work/library"]').exists()).toBe(true)
      expect(
        nav.get('a[href="/shelves/work/search"]').attributes('aria-current'),
      ).toBe('page')
    },
  )

  it('keeps linking the last shelf from pages outside a shelf', async () => {
    await mountSuspended(App, { route: '/shelves/work' })

    const page = await mountSuspended(App, { route: '/profile' })

    expect(
      page.find('nav[aria-label="Sidebar"] a[href="/shelves/work"]').exists(),
    ).toBe(true)
  })

  it('shows the current shelf in a switcher on phones and on desktop', async () => {
    const page = await mountSuspended(App, { route: '/shelves/work' })

    const switchers = page.findAll('button[aria-haspopup="menu"]')

    expect(switchers).toHaveLength(2)
    expect(switchers.map(button => button.text())).toEqual([
      'Shelf: Work',
      'Shelf: Work',
    ])
  })
})

describe('the shelf switcher', () => {
  it('switches to the same page on another shelf', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/work/library',
      attachTo: document.body,
    })

    const menu = await openSwitcher(page)
    const links = [...menu.querySelectorAll('a')].map(link => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ])

    expect(links).toEqual([
      ["Sarah's shelf", '/shelves/home/library'],
      ['Work', '/shelves/work/library'],
      ['New shelf', '/shelves/new'],
    ])
    expect(menu.querySelector('[aria-current="page"]')?.textContent).toBe(
      'Work',
    )

    page.unmount()
  })
})

describe('creating a shelf', () => {
  async function create(name: string) {
    const page = await mountSuspended(App, { route: '/shelves/new' })

    await page.get('input').setValue(name)
    await page.get('form').trigger('submit')
    await flushPromises()

    return page
  }

  it('names the shelf and goes to it', async () => {
    const page = await create('Garage')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/garage'))
    expect(page.findAll('button[aria-haspopup="menu"]')[0]!.text()).toBe(
      'Shelf: Garage',
    )
  })

  it('asks for a name before sending anything', async () => {
    server.requests = []

    const page = await create('   ')

    await vi.waitFor(() =>
      expect(page.text()).toContain('Give the shelf a name'),
    )
    expect(server.requests).toEqual([])
    expect(currentPath()).toBe('/shelves/new')
  })

  it('says why the server refused the shelf', async () => {
    const page = await create('Broken')

    await vi.waitFor(() =>
      expect(page.text()).toContain('That shelf could not be made'),
    )
    expect(currentPath()).toBe('/shelves/new')
  })
})
