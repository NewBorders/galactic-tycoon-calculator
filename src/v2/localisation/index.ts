import { TEMPLATE_VAR_REGEX } from '../utils/regex'

import { getCurrentLanguage } from './locale'
import { messages } from './messages'

export const translate = (key: string, vars?: Record<string, string | number>): string => {
  const lang = getCurrentLanguage()
  const template = messages[lang]?.[key] ?? key
  if (!vars) return template

  return template.replace(TEMPLATE_VAR_REGEX, (_, token: string) => {
    const value = vars[token]
    return value == null ? '' : String(value)
  })
}

export type { LanguageCode, LocaleCode } from './types'

export {
  availableLanguages,
  availableLocales,
  getCurrentLanguage,
  getCurrentLocale,
  setLanguage,
  setLocale,
} from './locale'
