import { ref } from 'vue';
export type LanguageCode = 'en' | 'de'

const STORAGE_KEY  = 'gt:language'

const messages: Record<LanguageCode, Record<string, string>> = {
  en: {
    fetchFromApi: 'Fetch from API',
    lastUpdate: 'Last update',
    source: 'source',
    materials: 'Materials',
    language: 'Language',
  },
  de: {
    fetchFromApi: 'Von API laden',
    lastUpdate: 'Letztes Update',
    source: 'Quelle',
    materials: 'Materialien',
    language: 'Sprache',
  },
}

const currentLanguage = ref<LanguageCode>(detectInitial())
document.documentElement.lang = currentLanguage.value

function detectInitial(): LanguageCode {
  const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null
  if (saved && messages[saved]) return saved
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return (['en', 'de'].includes(browser) ? browser : 'en') as LanguageCode
}

export function translate(key: string): string {
  return messages[currentLanguage.value]?.[key] ?? key
}

export function setLanguage(lang: LanguageCode): void {
  if (!messages[lang]) return
  currentLanguage.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
}

export function getCurrentLanguage(): LanguageCode {
  return currentLanguage.value
}

export const availableLanguages: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
]
