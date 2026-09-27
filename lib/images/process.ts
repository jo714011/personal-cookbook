import sharp from "sharp"

export const MAX_WIDTH = 1600

// sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it.
export async function processImage(
  input: string,
  output: string
): Promise<{ width: number; height: number; bytes: number }> {
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output)
  return { width: info.width, height: info.height, bytes: info.size }
}
