/** URL canônica usada por metadata, robots e sitemap. */
export function siteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL;

  try {
    return new URL(configuredUrl ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
