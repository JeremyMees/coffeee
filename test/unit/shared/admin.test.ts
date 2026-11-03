import { describe, expect, it } from 'vitest'
import { adminListForm, isAdminList } from '#shared/utils/admin'

describe('isAdminList', () => {
  it('knows the shared lists admins keep', () => {
    expect(isAdminList('flavorNotes')).toBe(true)
    expect(isAdminList('beans')).toBe(false)
  })
})

describe('adminListForm', () => {
  it('asks for what each list needs', () => {
    expect(adminListForm('grinders')).toBe('grinder')
    expect(adminListForm('farms')).toBe('origin')
    expect(adminListForm('roasters')).toBe('name')
  })
})
