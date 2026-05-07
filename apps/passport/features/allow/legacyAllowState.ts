export function persistLegacyAllowParams(input: {
  colormode: string | null
  pageId: string | null
  setTheme: (theme: string) => void
  uuid: string | null
}) {
  if (input.uuid) {
    localStorage.setItem("allow-uuid", input.uuid)
  }
  if (input.colormode) {
    input.setTheme(input.colormode)
  }
  if (input.pageId) {
    localStorage.setItem("page_id", input.pageId)
  }
}

export function restoreLegacyAllowUrlIfNeeded(currentHref: string, origin: string) {
  const allowUrl = localStorage.getItem("allow_url")
  if (!allowUrl) {
    return null
  }

  if (currentHref === `${origin}/allow` || currentHref === `${origin}/allow#`) {
    localStorage.removeItem("allow_url")
    return `/allow?${allowUrl}`
  }

  return null
}
