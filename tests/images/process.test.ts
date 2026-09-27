import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import sharp from "sharp"
import { afterAll, describe, expect, it } from "vitest"
import { MAX_WIDTH, processImage } from "@/lib/images/process"

// libvips caches open files; on Windows that blocks deleting the temp dir
sharp.cache(false)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cookbook-img-"))
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

async function makeJpeg(name: string, width: number, height: number) {
  const file = path.join(tmp, name)
  await sharp({ create: { width, height, channels: 3, background: "#a0522d" } })
    .withExif({ IFD0: { Copyright: "secret-location-data" } })
    .jpeg()
    .toFile(file)
  return file
}

describe("processImage", () => {
  it("resizes large images to MAX_WIDTH, outputs webp, and strips metadata", async () => {
    const input = await makeJpeg("big.jpg", 2400, 1600)
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const out = path.join(tmp, "big.webp")
    const info = await processImage(input, out)

    const meta = await sharp(out).metadata()
    expect(meta.format).toBe("webp")
    expect(meta.width).toBe(MAX_WIDTH)
    expect(meta.height).toBe(1067)
    expect(meta.exif).toBeUndefined()
    expect(info.width).toBe(MAX_WIDTH)
    expect(info.bytes).toBeGreaterThan(0)
  })

  it("does not upscale small images", async () => {
    const input = await makeJpeg("small.jpg", 800, 600)
    const out = path.join(tmp, "small.webp")
    await processImage(input, out)
    expect((await sharp(out).metadata()).width).toBe(800)
  })
})
