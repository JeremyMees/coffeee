import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEntryActions from '~/components/molecules/AdminEntryActions.vue'
import { allByTestId, byTestId, click, tid } from '../../fixtures'

const entry = {
  id: 'lime',
  name: 'Lime',
  detail: null,
  detailId: null,
  uses: 2,
}

function mountActions() {
  return mountSuspended(AdminEntryActions, {
    props: { entry },
    attachTo: document.body,
  })
}

async function openMenu() {
  const actions = await mountActions()

  await actions.get(tid('admin-entry-menu')).trigger('keydown', {
    key: 'Enter',
  })
  await flushPromises()

  return actions
}

describe('AdminEntryActions', () => {
  it('names the entry on every action', async () => {
    const actions = await mountActions()

    expect(
      ['update', 'merge', 'delete'].map(action =>
        actions.get(tid(`admin-entry-${action}`)).attributes('aria-label'),
      ),
    ).toEqual(['Update Lime', 'Merge Lime', 'Delete Lime'])
    expect(actions.get(tid('admin-entry-menu')).attributes('aria-label')).toBe(
      'Actions for Lime',
    )
    actions.unmount()
  })

  it('acts from the buttons', async () => {
    const actions = await mountActions()

    await actions.get(tid('admin-entry-merge')).trigger('click')

    expect(actions.emitted('act')).toEqual([['merge']])
    actions.unmount()
  })

  it('collects every action in one menu for small screens', async () => {
    const actions = await openMenu()

    expect(
      allByTestId('admin-entry-menu-content')[0]!.querySelectorAll(
        '[role="menuitem"]',
      ),
    ).toHaveLength(3)

    await click('admin-entry-menu-delete')

    expect(actions.emitted('act')).toEqual([['delete']])
    expect(byTestId('admin-entry-menu-content')).toBeNull()
    actions.unmount()
  })
})
