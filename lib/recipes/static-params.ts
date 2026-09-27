// Not kebab-case, so it can never collide with a real slug, tag, or category
export const PLACEHOLDER_PARAM = "__none__"

// Static export fails the build when generateStaticParams returns [] (e.g. no recipes yet,
// or no tags). Pages render notFound() for the placeholder.
export function orPlaceholder<K extends string>(
  params: Record<K, string>[],
  key: K
): Record<K, string>[] {
  return params.length
    ? params
    : [{ [key]: PLACEHOLDER_PARAM } as Record<K, string>]
}
