/**
 * Export all saved data as JSON file
 */
export function exportData(): void {
  const data = localStorage.getItem('productionCalculatorData')
  if (!data) {
    alert('No data to export')
    return
  }

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `galactic-tycoons-calculator-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Import data from JSON file
 */
export function importData(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        // Validate JSON
        JSON.parse(content)
        // Save to localStorage
        localStorage.setItem('productionCalculatorData', content)
        resolve(true)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Clear all saved data
 */
export function clearAllData(): boolean {
  if (confirm('Are you sure you want to delete all saved data? This action cannot be undone.')) {
    localStorage.removeItem('productionCalculatorData')
    return true
  }
  return false
}
