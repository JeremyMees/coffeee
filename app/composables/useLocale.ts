export function useLocale() {
  return useState('locale', () =>
    import.meta.server
      ? pickLocale(useRequestHeaders(['accept-language'])['accept-language'])
      : pickLocale(navigator.languages.join(',')),
  )
}
