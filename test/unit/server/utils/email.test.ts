import { loadNuxtConfig } from 'nuxt/kit'
import { render } from '@maizzle/framework'
import type { MaizzleConfig } from '@maizzle/framework'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailTemplate } from '#server/types/email'
import { fillEmailTemplate, renderEmail, sendEmail } from '#server/utils/email'
import { runtimeConfig, useStorage } from '#test/support/nitro'

const maizzleConfig = loadNuxtConfig({ envName: 'test' }).then(options => ({
  ...(options as unknown as { maizzle: MaizzleConfig }).maizzle,
  vite: {
    cacheDir: `node_modules/.cache/maizzle-vitest-${process.env.VITEST_POOL_ID}`,
  },
}))

async function compile(template: EmailTemplate) {
  const { html, plaintext } = await render(
    `app/emails/${template}.vue`,
    await maizzleConfig,
  )

  return { html, text: plaintext ?? '' }
}

async function storeCompiled(template: EmailTemplate, html: string) {
  const storage = useStorage('assets:server') as unknown as {
    setItemRaw: (key: string, value: string) => Promise<void>
  }
  await storage.setItemRaw(`emails:${template}.html`, html)
  await storage.setItemRaw(
    `emails:${template}.txt`,
    html.replace(/<[^>]+>/g, ''),
  )
}

const fetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetch)
  fetch.mockReset()
  Object.assign(runtimeConfig, {
    plunkApiKey: 'plunk-key',
    emailFrom: 'coffeee@example.com',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('filling an email template', () => {
  it('escapes values in the html and keeps them as written in the text', () => {
    const template = '<p>Hi {{ name }}</p>'

    expect(fillEmailTemplate(template, { name: 'Tom & <Sarah>' }, 'html')).toBe(
      '<p>Hi Tom &amp; &lt;Sarah&gt;</p>',
    )
    expect(fillEmailTemplate(template, { name: 'Tom & <Sarah>' }, 'text')).toBe(
      '<p>Hi Tom & <Sarah></p>',
    )
  })

  it('refuses a template that needs a value it was not given', () => {
    expect(() => fillEmailTemplate('{{ link }}', {}, 'html')).toThrow(
      'Missing email value for "link"',
    )
  })
})

describe('the email templates', () => {
  it.each(['VerifyEmail', 'ResetPassword'] as const)(
    'builds %s to inlined html and plain text with its placeholders',
    async template => {
      const { html, text } = await compile(template)

      expect(html).toContain('href="{{ link }}"')
      expect(html).toContain('{{ name }}')
      expect(html).toContain('style="')
      expect(text).toContain('{{ name }}')
      expect(text).not.toContain('<')
    },
    30000,
  )

  it.each(['ShelfInvite', 'ShelfNotification'] as const)(
    'builds %s with a link to the notification settings',
    async template => {
      const { html, text } = await compile(template)

      expect(html).toContain('href="{{ link }}"')
      expect(html).toContain('href="{{ settings }}"')
      expect(text).toContain('{{ settings }}')
    },
    30000,
  )

  it('builds ShelfNotification around what happened', async () => {
    const { html, text } = await compile('ShelfNotification')

    expect(html).toContain('{{ text }}')
    expect(text).toContain('{{ text }}')
  }, 30000)
})

describe('rendering an email', () => {
  it('fills the compiled html and text', async () => {
    await storeCompiled('VerifyEmail', '<a href="{{ link }}">{{ name }}</a>')

    expect(
      await renderEmail('VerifyEmail', {
        name: 'Tom',
        link: 'https://coffeee.example/verify?a=1&b=2',
      }),
    ).toEqual({
      html: '<a href="https://coffeee.example/verify?a=1&amp;b=2">Tom</a>',
      text: 'Tom',
    })
  })

  it('fails when the template was not compiled', async () => {
    await expect(
      renderEmail('ResetPassword', { name: 'Tom', link: 'x' }),
    ).rejects.toThrow('Compiled email template "ResetPassword" not found')
  })
})

describe('sending an email', () => {
  beforeEach(async () => {
    await storeCompiled('VerifyEmail', '<p>{{ name }} {{ link }}</p>')
  })

  it('sends the html and text through Plunk', async () => {
    fetch.mockResolvedValue(new Response('{}'))

    await sendEmail({
      to: 'tom@example.com',
      subject: 'Confirm your email for Coffeee',
      template: 'VerifyEmail',
      values: { name: 'Tom', link: 'https://coffeee.example' },
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://next-api.useplunk.com/v1/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer plunk-key',
        },
        body: JSON.stringify({
          from: 'coffeee@example.com',
          to: 'tom@example.com',
          subject: 'Confirm your email for Coffeee',
          body: '<p>Tom https://coffeee.example</p>',
          text: 'Tom https://coffeee.example',
        }),
      },
    )
  })

  it('fails when Plunk refuses the email', async () => {
    fetch.mockResolvedValue(new Response('Bad sender', { status: 422 }))

    await expect(
      sendEmail({
        to: 'tom@example.com',
        subject: 'Confirm',
        template: 'VerifyEmail',
        values: { name: 'Tom', link: 'x' },
      }),
    ).rejects.toThrow('Plunk refused the email: 422 Bad sender')
  })
})
