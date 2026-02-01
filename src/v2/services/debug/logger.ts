/**
 * Debug Logging System
 * 
 * Control logging via:
 * - localStorage: gt_debug_level (OFF, ERROR, WARN, INFO, DEBUG, TRACE)
 * - localStorage: gt_debug_modules (comma-separated list of modules to debug, or * for all)
 * 
 * Usage:
 * - In development: Set localStorage.setItem('gt_debug_level', 'DEBUG')
 * - Only specific module: localStorage.setItem('gt_debug_modules', 'SyncService,StateReversion')
 * 
 * Example:
 * const logger = createLogger('MyService')
 * logger.log('message') // only shows if DEBUG level
 * logger.warn('warning') // shows if WARN or higher
 * logger.error('error') // always shows (ERROR level)
 */

export type LogLevel = 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE'

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
}

interface Logger {
  trace: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

let cachedLevel: LogLevel | null = null
let cachedModules: Set<string> | null = null

function getDebugLevel(): LogLevel {
  if (cachedLevel) return cachedLevel
  
  try {
    const stored = localStorage.getItem('gt_debug_level')
    if (stored && stored in LOG_LEVEL_VALUES) {
      cachedLevel = stored as LogLevel
      return cachedLevel
    }
  } catch {
    // localStorage access failed
  }
  
  // Default: OFF in production, DEBUG in development
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cachedLevel = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env.NODE_ENV === 'development') ? 'DEBUG' : 'OFF'
  return cachedLevel
}

function getDebugModules(): Set<string> {
  if (cachedModules) return cachedModules
  
  try {
    const stored = localStorage.getItem('gt_debug_modules')
    if (stored) {
      cachedModules = new Set(stored.split(',').map(m => m.trim()).filter(Boolean))
      return cachedModules
    }
  } catch {
    // localStorage access failed
  }
  
  cachedModules = new Set()
  return cachedModules
}

function isModuleEnabled(moduleName: string): boolean {
  const modules = getDebugModules()
  if (modules.size === 0) return false
  return modules.has('*') || modules.has(moduleName)
}

function shouldLog(level: LogLevel, moduleName: string): boolean {
  const currentLevel = getDebugLevel()
  const levelValue = LOG_LEVEL_VALUES[level]
  const currentLevelValue = LOG_LEVEL_VALUES[currentLevel]
  
  if (levelValue > currentLevelValue) return false
  
  // ERROR and WARN always show (regardless of module setting)
  if (level === 'ERROR' || level === 'WARN') return true
  
  // DEBUG, INFO, TRACE only show if module is enabled
  return isModuleEnabled(moduleName)
}

/**
 * Create a logger for a specific module/service
 * @param moduleName Name of the module (e.g., 'SyncService', 'StateReversion')
 */
export function createLogger(moduleName: string): Logger {
  const prefix = `[${moduleName}]`

  return {
    trace: (message: string, ...args: unknown[]) => {
      if (shouldLog('TRACE', moduleName)) {
        console.log(`${prefix} ${message}`, ...args)
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('DEBUG', moduleName)) {
        console.log(`${prefix} ${message}`, ...args)
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('INFO', moduleName)) {
        console.info(`${prefix} ${message}`, ...args)
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('WARN', moduleName)) {
        console.warn(`${prefix} ${message}`, ...args)
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('ERROR', moduleName)) {
        console.error(`${prefix} ${message}`, ...args)
      }
    },
  }
}

/**
 * Reset cached values (useful for testing or changing debug settings at runtime)
 */
export function resetDebugCache(): void {
  cachedLevel = null
  cachedModules = null
}

/**
 * Set debug level at runtime
 */
export function setDebugLevel(level: LogLevel): void {
  try {
    localStorage.setItem('gt_debug_level', level)
    resetDebugCache()
  } catch {
    console.warn('Failed to set debug level in localStorage')
  }
}

/**
 * Set debug modules at runtime
 * @param modules Comma-separated module names, or '*' for all
 */
export function setDebugModules(modules: string): void {
  try {
    localStorage.setItem('gt_debug_modules', modules)
    resetDebugCache()
  } catch {
    console.warn('Failed to set debug modules in localStorage')
  }
}

/**
 * Get current debug configuration
 */
export function getDebugConfig(): {
  level: LogLevel
  modules: string[]
} {
  return {
    level: getDebugLevel(),
    modules: Array.from(getDebugModules()),
  }
}

/**
 * Expose debug control on window in development
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__gt_debug = {
    setLevel: setDebugLevel,
    setModules: setDebugModules,
    getConfig: getDebugConfig,
    reset: resetDebugCache,
  }
  console.info(
    '%c🐛 Debug logging available',
    'color: #ff00ff; font-weight: bold',
    '\nSet level: __gt_debug.setLevel("DEBUG")',
    '\nSet modules: __gt_debug.setModules("SyncService,StateReversion")',
    '\nEnable all: __gt_debug.setModules("*")',
    '\nSee config: __gt_debug.getConfig()'
  )
}
