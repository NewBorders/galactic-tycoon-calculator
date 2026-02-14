let spriteLoaded = false
let spriteLoadPromise: Promise<void> | null = null

/**
 * Load the SVG sprite and inject it into the DOM (hidden)
 * This way, all <use> elements can reference symbols without loading the file repeatedly
 */
export async function loadSvgSprite(): Promise<void> {
  // Return existing promise if already loading
  if (spriteLoadPromise) {
    return spriteLoadPromise
  }

  // Already loaded
  if (spriteLoaded) {
    return Promise.resolve()
  }

  spriteLoadPromise = (async () => {
    try {
      const response = await fetch('/galactic_tycoon_sprites.svg')
      if (!response.ok) {
        throw new Error(`Failed to load sprites: ${response.status}`)
      }

      const svgText = await response.text()
      
      // Create a container div for the SVG sprite
      const container = document.createElement('div')
      container.id = 'svg-sprite-container'
      container.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden;'
      container.innerHTML = svgText

      // Inject into body
      document.body.insertBefore(container, document.body.firstChild)
      
      spriteLoaded = true
      console.log('[SpriteLoader] SVG sprite loaded and injected into DOM')
      
      // Notify spriteIndex that DOM is ready
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sprite-loaded'))
      }
    } catch (error) {
      console.error('[SpriteLoader] Failed to load sprite:', error)
      spriteLoadPromise = null // Allow retry
      throw error
    }
  })()

  return spriteLoadPromise
}

/**
 * Check if sprite is loaded
 */
export function isSpriteLoaded(): boolean {
  return spriteLoaded
}
