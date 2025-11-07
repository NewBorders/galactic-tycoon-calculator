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
    noResults: 'No results',
    editName: 'Edit name',
    save: 'Save',
    cancel: 'Cancel',
    buildingSearch: 'Search building…',
    recipeSearch: 'Search recipe…',
    requiresBuilding: 'Requires building',
    noRecipesConfigured: 'No recipes configured yet',
    dailySummary: 'Daily summary',
    totalRevenue: 'Total revenue',
    totalCosts: 'Total costs',
    netResult: 'Net result',
    adminCost: 'Administration cost',
    workerConsumption: 'Worker consumption',
    materialBalance: 'Materials balance',
    material: 'Material',
    perDay: 'per day',
    workers: 'Workers',
    activeModules: 'Active modules',
    queueTimeShare: 'Queue time share',
    dailyRunsPerModule: 'Runs per module per day',
    outputPerDay: 'Output per day',
    inputsPerDay: 'Inputs',
    cycleTime: 'Cycle time',
    baseCycleTime: 'Base cycle time',
    actualCycleTime: 'Effective cycle time',
    minutes: 'minutes',
    workforcePenalty: 'Housing is insufficient – add accommodation to restore full output.',
    workforceOverview: 'Workforce coverage',
    requiredWorkers: 'Required',
    housingCapacity: 'Housing',
    coverage: 'Coverage',
    workforceDemand: 'Workforce demand',
    productivityFactor: 'Productivity bonus',
    abundanceFactor: 'Abundance factor',
    abundanceZeroWarning: 'No abundance on this planet – production halted.',
    planetaryAbundance: 'Planetary abundance',
    requiresAbundance: 'Unavailable on this planet – no abundance.',
    optionalHint: 'Optional consumables increase productivity. Toggle to apply them.',
    optionalActive: 'optional active',
    optionalInactive: 'optional inactive',
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
    noResults: 'Keine Treffer',
    editName: 'Name bearbeiten',
    save: 'Speichern',
    cancel: 'Abbrechen',
    buildingSearch: 'Gebäude suchen…',
    recipeSearch: 'Rezept suchen…',
    requiresBuilding: 'Benötigt Gebäude',
    noRecipesConfigured: 'Noch keine Rezepte konfiguriert',
    dailySummary: 'Tägliche Übersicht',
    totalRevenue: 'Gesamterlös',
    totalCosts: 'Gesamtkosten',
    netResult: 'Nettoergebnis',
    adminCost: 'Verwaltungskosten',
    workerConsumption: 'Verbrauch der Arbeiter',
    materialBalance: 'Materialbilanz',
    material: 'Material',
    perDay: 'pro Tag',
    workers: 'Arbeiter',
    activeModules: 'Aktive Module',
    queueTimeShare: 'Zeitanteil der Queue',
    dailyRunsPerModule: 'Durchgänge pro Tag',
    outputPerDay: 'Ausstoß pro Tag',
    inputsPerDay: 'Input',
    cycleTime: 'Zykluszeit',
    baseCycleTime: 'Normale Zykluszeit',
    actualCycleTime: 'Reale Zykluszeit',
    minutes: 'Minuten',
    workforcePenalty: 'Durch fehlenden Wohnraum gebremst – mehr Wohngebäude hinzufügen.',
    workforceOverview: 'Arbeitskräfte & Wohnraum',
    requiredWorkers: 'Benötigt',
    housingCapacity: 'Wohnraum',
    coverage: 'Abdeckung',
    workforceDemand: 'Arbeitskräftebedarf',
    productivityFactor: 'Produktivitätsbonus',
    abundanceFactor: 'Vorkommenfaktor',
    abundanceZeroWarning: 'Kein Vorkommen auf diesem Planeten – Produktion gestoppt.',
    planetaryAbundance: 'Planeten-Vorkommen',
    requiresAbundance: 'Auf diesem Planeten nicht verfügbar – kein Vorkommen.',
    optionalHint: 'Optionale Verbrauchsgüter steigern die Produktivität. Aktivieren zum Anwenden.',
    optionalActive: 'optional aktiv',
    optionalInactive: 'optional inaktiv',
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
