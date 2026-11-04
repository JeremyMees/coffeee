import { afterAll, beforeEach } from 'vitest'
import { closeTestDatabase, resetTestDatabase } from '#test/support/database'

beforeEach(() => resetTestDatabase())

afterAll(() => closeTestDatabase())
