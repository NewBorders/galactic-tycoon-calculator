import { ref } from 'vue'

import { LOCALE_STORAGE_KEY, LANGUAGE_STORAGE_KEY } from '../constants/keys'

import { LocaleCode, LanguageCode } from './types'

const localeToLanguage: Record<LocaleCode, LanguageCode> = {
  'en-GB': 'en',
  'de-DE': 'de',
}

const languageToDefaultLocale: Record<LanguageCode, LocaleCode> = {
  en: 'en-GB',
  de: 'de-DE',
}

const detectInitialLocale = (): LocaleCode => {
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleCode | null
  if (savedLocale && savedLocale in localeToLanguage) return savedLocale

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null
  if (savedLanguage && savedLanguage in languageToDefaultLocale)
    return languageToDefaultLocale[savedLanguage]

  const browserLocale = navigator.language || 'en-GB'
  const normalised = browserLocale.toLowerCase()

  const exactMatch = (Object.keys(localeToLanguage) as LocaleCode[]).find(
    (locale) => locale.toLowerCase() === normalised,
  )
  if (exactMatch) return exactMatch

  if (normalised.startsWith('de')) return 'de-DE'
  return 'en-GB'
}

const currentLocale = ref<LocaleCode>(detectInitialLocale())
const currentLanguage = ref<LanguageCode>(localeToLanguage[currentLocale.value])

document.documentElement.lang = currentLanguage.value

export const getCurrentLocale = (): LocaleCode => currentLocale.value

export const setLocale = (locale: LocaleCode): void => {
  if (!(locale in localeToLanguage)) return

  currentLocale.value = locale
  currentLanguage.value = localeToLanguage[locale]

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage.value)
  } catch {
    // going descope storage errors for now
  }

  document.documentElement.lang = currentLanguage.value
}

export const availableLocales: Array<{ code: LocaleCode; label: string }> = [
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'de-DE', label: 'Deutsch (DE)' },
]

export const getCurrentLanguage = (): LanguageCode => currentLanguage.value

export function setLanguage(lang: LanguageCode): void {
  const locale = languageToDefaultLocale[lang]
  if (!locale) return
  setLocale(locale)
}

export const availableLanguages: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
]
