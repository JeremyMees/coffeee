import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ConfirmDialog from '~/components/templates/ConfirmDialog.vue'
import { byTestId, click } from '../../fixtures'

function mountDialog(props: Record<string, unknown> = {}) {
  return mountSuspended(ConfirmDialog, {
    props: {
      title: 'Delete Lime?',
      description: "This can't be undone.",
      confirm: 'Delete flavor note',
      open: true,
      ...props,
    },
    attachTo: document.body,
  })
}

describe('ConfirmDialog', () => {
  it('asks to confirm with the title, description and action', async () => {
    await mountDialog()

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete Lime?',
    )
    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      "This can't be undone.",
    )
    expect(byTestId('confirm-dialog-confirm')?.textContent).toContain(
      'Delete flavor note',
    )
    expect(byTestId('form-error')).toBeNull()
  })

  it('tells when the action is confirmed', async () => {
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    expect(dialog.emitted('confirm')).toHaveLength(1)
  })

  it('closes when cancelled', async () => {
    const dialog = await mountDialog()

    await click('confirm-dialog-cancel')

    expect(dialog.emitted('update:open')).toEqual([[false]])
  })

  it('shows what went wrong and holds the action while it runs', async () => {
    await mountDialog({ error: 'Still in use', pending: true })

    expect(byTestId('form-error')?.textContent).toContain('Still in use')
    expect(
      byTestId<HTMLButtonElement>('confirm-dialog-confirm')?.disabled,
    ).toBe(true)
  })
})
