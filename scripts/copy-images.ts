import fs from "node:fs"
import path from "node:path"

const SRC = path.join(process.cwd(), "content", "recipes")
const DEST = path.join(process.cwd(), "public", "recipe-images")
const IMAGE = /\.(webp|jpe?g|png)$/i

fs.rmSync(DEST, { recursive: true, force: true })
let count = 0

if (fs.existsSync(SRC)) {
  for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    for (const file of fs.readdirSync(path.join(SRC, entry.name))) {
      if (!IMAGE.test(file)) continue
      fs.mkdirSync(path.join(DEST, entry.name), { recursive: true })
      fs.copyFileSync(
        path.join(SRC, entry.name, file),
        path.join(DEST, entry.name, file)
      )
      count++
    }
  }
}

console.log(`✓ copied ${count} recipe image(s) to public/recipe-images`)
