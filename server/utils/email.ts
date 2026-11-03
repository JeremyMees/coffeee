import { useRuntimeConfig, useStorage } from 'nitropack/runtime'
import type { Email, EmailTemplate, EmailValues } from '#server/types/email'

const plunkSend = 'https://next-api.useplunk.com/v1/send'
const maizzleDevServer = 'http://localhost:4321'
const placeholder = /\{\{\s*(\w+)\s*\}\}/g

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => htmlEscapes[char]!)
}

export function fillEmailTemplate(
  template: string,
  values: Record<string, string>,
  format: 'html' | 'text',
) {
  return template.replace(placeholder, (_, key: string) => {
    const value = values[key]

    if (value === undefined) {
      throw new Error(`Missing email value for "${key}"`)
    }

    return format === 'html' ? escapeHtml(value) : value
  })
}

async function fetchFromMaizzle(
  endpoint: 'render' | 'plaintext',
  template: EmailTemplate,
) {
  const response = await fetch(
    `${maizzleDevServer}/__maizzle/${endpoint}/app/emails/${template}`,
  )

  return response.text()
}

async function loadEmailTemplate(template: EmailTemplate) {
  if (import.meta.dev) {
    const [html, text] = await Promise.all([
      fetchFromMaizzle('render', template),
      fetchFromMaizzle('plaintext', template),
    ])

    return { html, text }
  }

  const storage = useStorage('assets:server')
  const [html, text] = await Promise.all([
    storage.getItem<string>(`emails:${template}.html`),
    storage.getItem<string>(`emails:${template}.txt`),
  ])

  if (!html || !text) {
    throw new Error(`Compiled email template "${template}" not found`)
  }

  return { html, text }
}

export async function renderEmail<Template extends EmailTemplate>(
  template: Template,
  values: EmailValues[Template],
) {
  const { html, text } = await loadEmailTemplate(template)

  return {
    html: fillEmailTemplate(html, values, 'html'),
    text: fillEmailTemplate(text, values, 'text'),
  }
}

export async function sendEmail<Template extends EmailTemplate>(
  email: Email<Template>,
) {
  const { plunkApiKey, emailFrom } = useRuntimeConfig()
  const { html, text } = await renderEmail(email.template, email.values)

  const response = await fetch(plunkSend, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plunkApiKey}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: email.to,
      subject: email.subject,
      body: html,
      text,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Plunk refused the email: ${response.status} ${await response.text()}`,
    )
  }
}
