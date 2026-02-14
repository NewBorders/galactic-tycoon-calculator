/**
 * Planning Mode Guards
 * 
 * Provides guards to prevent editing current state when not in planning mode.
 * Critical for data integrity: "die werte müssen immer stimmen"
 */

import { usePlanningMode } from '@/v2/services/planningMode'

export interface PlanningGuardResult {
  allowed: boolean
  message?: string
}

export function usePlanningGuards() {
  const { isPlanningActive } = usePlanningMode()

  /**
   * Check if edit operation is allowed.
   * Returns { allowed: true } if in planning mode, otherwise { allowed: false, message }
   */
  function requirePlanningMode(operationName?: string): PlanningGuardResult {
    if (isPlanningActive.value) {
      return { allowed: true }
    }

    const message = operationName 
      ? `Enter planning mode to ${operationName}`
      : 'Enter planning mode to make changes'

    return {
      allowed: false,
      message
    }
  }

  /**
   * Show confirmation dialog for planning mode requirement
   */
  function showPlanningRequired(message?: string) {
    const dialog = document.getElementById('planning-required-dialog') as HTMLDialogElement
    if (dialog) {
      // Update message if element exists
      const messageEl = dialog.querySelector('.planning-required-message')
      if (messageEl && message) {
        messageEl.textContent = message
      }
      dialog.showModal()
    }
  }

  /**
   * Guard wrapper for edit operations
   * Usage: guardEdit(() => actualEdit(), 'add building')
   */
  function guardEdit<T>(operation: () => T, operationName?: string): T | null {
    const result = requirePlanningMode(operationName)
    
    if (!result.allowed) {
      showPlanningRequired(result.message)
      return null
    }

    return operation()
  }

  return {
    isPlanningActive,
    requirePlanningMode,
    showPlanningRequired,
    guardEdit
  }
}
