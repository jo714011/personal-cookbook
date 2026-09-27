import fs from "node:fs"
import path from "node:path"
import { processImage } from "../lib/images/process"

const [input, output] = process.argv.slice(2)
if (!input || !output || !output.endsWith(".webp")) {
  console.error("Usage: npm run image -- <input-image> <output.webp>")
  process.exit(2)
}

fs.mkdirSync(path.dirname(output), { recursive: true })
try {
  const { width, height, bytes } = await processImage(input, output)
  console.log(
    `✓ ${output} (${width}×${height}, ${Math.round(bytes / 1024)} KB)`
  )
} catch (e) {
  console.error(`✗ Could not process ${input}: ${(e as Error).message}`)
  if (/heif|heic/i.test(input)) {
    console.error(
      "  HEIC may be unsupported. Re-export the photo as JPEG and retry."
    )
  }
  process.exit(1)
}
