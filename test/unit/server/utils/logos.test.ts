import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { shapeLogo } from '#server/utils/logos'

function wordmark(background = '#ffffff') {
  return sharp({
    create: { width: 300, height: 100, channels: 3, background },
  })
    .composite([
      {
        input: {
          create: {
            width: 200,
            height: 40,
            channels: 3,
            background: '#111111',
          },
        },
        left: 50,
        top: 30,
      },
    ])
    .png()
    .toBuffer()
}

function badge() {
  return sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#ffffff"/><circle cx="200" cy="200" r="100" fill="#c0392b"/></svg>',
    ),
  )
    .png()
    .toBuffer()
}

function svg(body: string) {
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">${body}</svg>`,
    ),
  )
    .png()
    .toBuffer()
}

async function pixelAt(data: Buffer, x: number, y: number) {
  const { data: pixel } = await sharp(data)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return [...pixel]
}

function near(actual: number[], expected: number[]) {
  return actual.every(
    (channel, index) => Math.abs(channel - expected[index]!) < 12,
  )
}

describe('shaping a logo', () => {
  it('lets a round badge fill the whole circle', async () => {
    const logo = await shapeLogo(await badge())
    const { width, height, format } = await sharp(logo!.data).metadata()

    expect(logo!.type).toBe('image/webp')
    expect(format).toBe('webp')
    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(198)
    expect(width).toBeLessThanOrEqual(202)
    expect(near(await pixelAt(logo!.data, 100, 2), [192, 57, 43])).toBe(true)
  })

  it('finds a round badge inside plain frames', async () => {
    const logo = await shapeLogo(
      await svg(
        '<rect width="400" height="400" fill="#e5e7eb"/><rect x="60" y="60" width="280" height="280" fill="#ffffff"/><circle cx="200" cy="200" r="100" fill="#1f2937"/>',
      ),
    )
    const { width, height } = await sharp(logo!.data).metadata()

    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(198)
    expect(width).toBeLessThanOrEqual(202)
    expect(near(await pixelAt(logo!.data, 0, 0), [255, 255, 255])).toBe(true)
  })

  it('ignores a stray line next to the logo', async () => {
    const logo = await shapeLogo(
      await svg(
        '<rect width="400" height="400" fill="#f3f3f3"/><circle cx="200" cy="180" r="100" fill="#1f2937"/><rect x="60" y="320" width="280" height="1" fill="#6b625f"/>',
      ),
    )
    const { width, height } = await sharp(logo!.data).metadata()

    expect(width).toBe(height)
    expect(width).toBeLessThanOrEqual(202)
  })

  it('keeps a framed wordmark whole', async () => {
    const logo = await shapeLogo(
      await svg(
        '<rect width="400" height="400" fill="#ffffff"/><rect x="50" y="150" width="300" height="100" fill="#facc15" stroke="#111111" stroke-width="6"/><rect x="100" y="185" width="200" height="30" fill="#b91c1c"/>',
      ),
    )
    const { width } = await sharp(logo!.data).metadata()

    expect(width).toBeGreaterThan(Math.hypot(306, 106))
    expect(near(await pixelAt(logo!.data, 0, 0), [255, 255, 255])).toBe(true)
  })

  it('fits a wide wordmark inside the circle with room around it', async () => {
    const logo = await shapeLogo(await wordmark())
    const { width, height } = await sharp(logo!.data).metadata()

    expect(width).toBe(height)
    expect(width).toBeGreaterThan(Math.hypot(200, 40))
    expect(near(await pixelAt(logo!.data, 0, 0), [255, 255, 255])).toBe(true)
  })

  it('pads with the background colour of the logo', async () => {
    const logo = await shapeLogo(await wordmark('#f4e4c1'))

    expect(near(await pixelAt(logo!.data, 0, 0), [244, 228, 193])).toBe(true)
  })

  it('puts a transparent logo on white', async () => {
    const transparent = await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: 60,
              height: 20,
              channels: 3,
              background: '#111111',
            },
          },
          left: 30,
          top: 50,
        },
      ])
      .png()
      .toBuffer()

    const logo = await shapeLogo(transparent)

    expect(near(await pixelAt(logo!.data, 0, 0), [255, 255, 255])).toBe(true)
  })

  it('keeps a plain image as a square', async () => {
    const plain = await sharp({
      create: { width: 80, height: 40, channels: 3, background: '#e4572e' },
    })
      .png()
      .toBuffer()

    const { width, height } = await sharp(
      (await shapeLogo(plain))!.data,
    ).metadata()

    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(80)
  })

  it('skips a file that is not an image', async () => {
    expect(await shapeLogo(Buffer.from('not a logo'))).toBeNull()
  })
})
