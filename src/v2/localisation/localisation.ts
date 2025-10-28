import { ref } from 'vue'

export type LanguageCode = 'en' | 'de'

const STORAGE_KEY = 'gt:language'

const messages: Record<LanguageCode, Record<string, string>> = {
  en: {
    language: 'Language',
    tabRecipes: 'V2 → V1 Recipe Translator',
    tabPlayerConfig: 'Player configuration',
    planetSearch: 'Search planet…',
    selectPlanet: 'Select planet…',
    addBase: 'Add base',
    alreadyAdded: '(already added)',
    delete: 'Delete',
    moveUp: 'Up',
    moveDown: 'Down',
    addBuilding: 'Add building…',
    building: 'Building',
    level: 'Level',
    count: 'Count',
    recipesConfigPlaceholder: 'Recipes config per base will follow',
    noResults: 'No results',
    editName: 'Edit name',
    save: 'Save',
    cancel: 'Cancel',
  },
  de: {
    language: 'Sprache',
    tabRecipes: 'V2 → V1 Rezept-Übersetzer',
    tabPlayerConfig: 'Spieler-Konfiguration',
    planetSearch: 'Planet suchen…',
    selectPlanet: 'Planet wählen…',
    addBase: 'Basis hinzufügen',
    alreadyAdded: '(bereits hinzugefügt)',
    delete: 'Löschen',
    moveUp: 'Hoch',
    moveDown: 'Runter',
    addBuilding: 'Gebäude hinzufügen…',
    building: 'Gebäude',
    level: 'Level',
    count: 'Anzahl',
    recipesConfigPlaceholder: 'Rezepte-Konfiguration pro Basis folgt',
    noResults: 'Keine Treffer',
    editName: 'Name bearbeiten',
    save: 'Speichern',
    cancel: 'Abbrechen',
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
