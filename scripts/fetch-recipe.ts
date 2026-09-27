import { extractRecipe } from "../lib/import/extract-recipe"

const url = process.argv[2]
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Usage: npm run fetch-recipe -- <https://recipe-url>")
  process.exit(2)
}

let res: Response
try {
  res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  })
} catch (e) {
  console.error(`✗ Fetch failed: ${(e as Error).message}`)
  process.exit(1)
}

if (!res.ok) {
  console.error(`✗ Fetch failed: HTTP ${res.status} ${res.statusText}`)
  process.exit(1)
}

const recipe = extractRecipe(await res.text(), res.url)
if (!recipe) {
  console.error("✗ No schema.org Recipe data found on this page")
  process.exit(1)
}

console.log(JSON.stringify(recipe, null, 2))
