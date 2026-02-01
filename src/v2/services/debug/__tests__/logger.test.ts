import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createLogger, setDebugLevel, setDebugModules, getDebugConfig, resetDebugCache } from '../logger'

describe('Debug Logger', () => {
  beforeEach(() => {
    resetDebugCache()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should not log by default (OFF level)', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createLogger('TestModule')

    logger.debug('debug message')
    logger.info('info message')
    logger.trace('trace message')

    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should log ERROR and WARN always', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createLogger('TestModule')

    logger.warn('warning message')

    expect(consoleSpy).toHaveBeenCalledWith('[TestModule] warning message')
    consoleSpy.mockRestore()
  })

  it('should log DEBUG when level is DEBUG', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setDebugLevel('DEBUG')
    setDebugModules('TestModule')

    const logger = createLogger('TestModule')
    logger.debug('debug message')

    expect(consoleSpy).toHaveBeenCalledWith('[TestModule] debug message')
    consoleSpy.mockRestore()
  })

  it('should filter by module name', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setDebugLevel('DEBUG')
    setDebugModules('ServiceA')

    const loggerA = createLogger('ServiceA')
    const loggerB = createLogger('ServiceB')

    loggerA.debug('message from A')
    loggerB.debug('message from B')

    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('[ServiceA] message from A')
    consoleSpy.mockRestore()
  })

  it('should support wildcard module matching', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setDebugLevel('DEBUG')
    setDebugModules('*')

    const loggerA = createLogger('ServiceA')
    const loggerB = createLogger('ServiceB')

    loggerA.debug('message from A')
    loggerB.debug('message from B')

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    consoleSpy.mockRestore()
  })

  it('should handle multiple module names', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setDebugLevel('DEBUG')
    setDebugModules('ServiceA, ServiceB')

    const loggerA = createLogger('ServiceA')
    const loggerB = createLogger('ServiceB')
    const loggerC = createLogger('ServiceC')

    loggerA.debug('from A')
    loggerB.debug('from B')
    loggerC.debug('from C')

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    consoleSpy.mockRestore()
  })

  it('should support different log levels', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    setDebugLevel('WARN')
    setDebugModules('*')

    const logger = createLogger('TestModule')

    logger.trace('trace')
    logger.debug('debug')
    logger.info('info')
    logger.warn('warn')

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith('[TestModule] warn')
    warnSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('should return debug config', () => {
    setDebugLevel('DEBUG')
    setDebugModules('ServiceA, ServiceB')

    const config = getDebugConfig()
    expect(config.level).toBe('DEBUG')
    expect(config.modules).toContain('ServiceA')
    expect(config.modules).toContain('ServiceB')
  })
})
