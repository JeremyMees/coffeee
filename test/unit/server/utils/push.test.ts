import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebPushError } from 'web-push'
import { sendPush } from '#server/utils/push'

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }))

vi.mock('web-push', async importOriginal => ({
  ...(await importOriginal<object>()),
  sendNotification,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    productionUrl: 'https://coffeee.example',
    vapidPrivateKey: 'private-key',
    public: { vapidPublicKey: 'public-key' },
  }),
}))

const target = {
  endpoint: 'https://push.example.com/phone',
  p256dh: 'phone-p256dh',
  auth: 'phone-auth',
}
const message = { title: 'Home', body: 'Tom left Home', path: '/shelves/home' }

beforeEach(() => {
  sendNotification.mockReset()
})

describe('sendPush', () => {
  it('sends the message to the device with the key pair', async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 })

    expect(await sendPush(target, message)).toBe('sent')
    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: target.endpoint,
        keys: { p256dh: 'phone-p256dh', auth: 'phone-auth' },
      },
      JSON.stringify(message),
      expect.objectContaining({
        vapidDetails: {
          subject: 'https://coffeee.example',
          publicKey: 'public-key',
          privateKey: 'private-key',
        },
      }),
    )
  })

  it.each([404, 410])(
    'reports a device the push service answers %i for as gone',
    async status => {
      sendNotification.mockRejectedValue(
        new WebPushError('Gone', status, {}, '', target.endpoint),
      )

      expect(await sendPush(target, message)).toBe('gone')
    },
  )

  it('passes on any other failure', async () => {
    sendNotification.mockRejectedValue(
      new WebPushError('Too many', 429, {}, '', target.endpoint),
    )

    await expect(sendPush(target, message)).rejects.toThrow('Too many')
  })
})
