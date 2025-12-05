<script setup lang="ts">
import { ref } from 'vue'
import { useWorldData } from '@/v2/services/worldData'
import { loadGameData } from '@/v2/services/gamedata/service'
import { fetchCompanyBases } from '@/v2/services/api/warehouseService'
import type { World } from '@/v2/services/api/types'

const { setApiKey, activeWorld, switchWorld } = useWorldData()

const selectedWorld = ref<World>(activeWorld.value)
const apiKeyInput = ref('')
const saving = ref(false)
const error = ref('')
const statusMessage = ref('')

async function saveApiKey() {
  const trimmed = apiKeyInput.value.trim()
  
  if (!trimmed) {
    error.value = 'Please enter your API key'
    return
  }

  saving.value = true
  error.value = ''
  statusMessage.value = 'Validating API key...'

  try {
    // Switch to selected world first
    if (selectedWorld.value !== activeWorld.value) {
      switchWorld(selectedWorld.value)
    }
    
    // Set the API key (this makes it available for subsequent API calls)
    setApiKey(trimmed)
    
    // Validate API key by loading game data
    statusMessage.value = 'Loading game data...'
    await loadGameData(true)
    
    // Try to load player bases to fully validate the API key
    statusMessage.value = 'Loading your bases...'
    try {
      await fetchCompanyBases(trimmed, selectedWorld.value)
    } catch (baseError) {
      // Bases might fail if user has no bases yet, but game data succeeded
      // This is not a critical error
      console.warn('Failed to load bases (might be empty):', baseError)
    }
    
    statusMessage.value = 'Success! Loading application...'
    // API key is valid, component will be hidden by parent
    // Small delay to show success message
    await new Promise(resolve => setTimeout(resolve, 500))
    
  } catch (err) {
    // API key is invalid, remove it
    setApiKey('')
    
    if (err instanceof Error) {
      // Check for common API error patterns
      if (err.message.includes('401') || err.message.includes('403')) {
        error.value = 'Invalid API key. Please check your key and try again.'
      } else if (err.message.includes('404')) {
        error.value = 'API endpoint not found. Please check your galaxy selection.'
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        error.value = 'Network error. Please check your internet connection.'
      } else {
        error.value = `Failed to validate API key: ${err.message}`
      }
    } else {
      error.value = 'Failed to validate API key. Please try again.'
    }
    
    statusMessage.value = ''
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="api-landing">
    <div class="api-landing__container">
      <!-- Hero Section -->
      <div class="api-landing__hero">
        <div class="api-landing__icon">🚀</div>
        <h1 class="api-landing__title">Welcome to Galactic Tycoon Calculator</h1>
        <p class="api-landing__subtitle">
          Your production planning tool for Galactic Tycoons
        </p>
      </div>

      <!-- Features -->
      <div class="api-landing__features">
        <div class="api-landing__feature">
          <div class="feature-icon">📊</div>
          <h3 class="feature-title">Production Planning</h3>
          <p class="feature-text">Plan your base expansions and optimize production chains</p>
        </div>
        <div class="api-landing__feature">
          <div class="feature-icon">🎯</div>
          <h3 class="feature-title">Planning Mode</h3>
          <p class="feature-text">Test changes before applying them to your actual bases</p>
        </div>
        <div class="api-landing__feature">
          <div class="feature-icon">🔔</div>
          <h3 class="feature-title">Price Alerts</h3>
          <p class="feature-text">Get notified when material prices reach your targets</p>
        </div>
      </div>

      <!-- API Key Setup -->
      <div class="api-landing__setup">
        <h2 class="setup-title">Get Started</h2>
        <p class="setup-description">
          Select your galaxy and enter your Galactic Tycoons API key to sync your bases.
        </p>

        <form @submit.prevent="saveApiKey" class="setup-form">
          <!-- World Selection -->
          <div class="form-group">
            <label for="world-select" class="form-label">
              Galaxy
            </label>
            <select
              id="world-select"
              v-model="selectedWorld"
              class="form-select"
              :disabled="saving"
            >
              <option value="g1">🌌 Galaxy 1</option>
              <option value="g2">🌠 Galaxy 2</option>
            </select>
          </div>

          <div class="form-group">
            <label for="api-key-input" class="form-label">
              API Key
            </label>
            <input
              id="api-key-input"
              v-model="apiKeyInput"
              type="text"
              placeholder="Enter your API key..."
              class="form-input"
              :disabled="saving"
            />
            <p v-if="error" class="form-error">{{ error }}</p>
            <p v-if="statusMessage && !error" class="form-status">{{ statusMessage }}</p>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              :disabled="saving || !apiKeyInput.trim()"
              class="btn btn-primary btn-primary--full"
            >
              <span v-if="!saving">Save & Continue</span>
              <span v-else class="btn-loading">
                <span class="spinner"></span>
                {{ statusMessage || 'Saving...' }}
              </span>
            </button>
          </div>
        </form>

        <!-- Help -->
        <div class="setup-help">
          <h3 class="help-title">Where to find your API key?</h3>
          <ol class="help-list">
            <li>Log in to <a href="https://www.galactictycoon.com" target="_blank" rel="noopener" class="help-link">Galactic Tycoons</a></li>
            <li>Navigate to your account settings</li>
            <li>Find the "API Access" section</li>
            <li>Copy your API key and paste it above</li>
          </ol>
          <p class="help-note">
            💡 You can also use this calculator offline without an API key, but you won't be able to sync your bases.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="api-landing__footer">
        <p class="footer-text">
          Need help? Check out the 
          <a href="https://github.com/NewBorders/galactic-tycoon-calculator" target="_blank" rel="noopener" class="footer-link">
            documentation
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-landing {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.api-landing__container {
  max-width: 48rem;
  width: 100%;
}

.api-landing__hero {
  text-align: center;
  margin-bottom: 3rem;
}

.api-landing__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.api-landing__title {
  margin: 0 0 0.5rem;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.api-landing__subtitle {
  margin: 0;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.api-landing__features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.api-landing__feature {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 0.75rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.feature-title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
}

.feature-text {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.api-landing__setup {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.setup-title {
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-heading, #1a202c);
  text-align: center;
}

.setup-description {
  margin: 0 0 2rem;
  font-size: 1rem;
  color: var(--color-text-soft, #718096);
  text-align: center;
  line-height: 1.5;
}

.setup-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading, #2d3748);
}

.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border, #e2e8f0);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
  color: var(--color-text, #2d3748);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--color-primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border, #e2e8f0);
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: monospace;
  transition: all 0.2s;
  background: white;
  color: var(--color-text, #2d3748);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--color-danger, #ef4444);
  font-weight: 500;
}

.form-status {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--color-primary, #667eea);
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-primary--full {
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: var(--color-background-soft, #f7fafc);
  color: var(--color-text, #2d3748);
  border: 1px solid var(--color-border, #e2e8f0);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-background-mute, #edf2f7);
}

.setup-help {
  padding: 1.5rem;
  background: var(--color-background-soft, #f7fafc);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border, #e2e8f0);
}

.help-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading, #2d3748);
}

.help-list {
  margin: 0 0 1rem;
  padding-left: 1.5rem;
  color: var(--color-text, #4a5568);
  line-height: 1.75;
}

.help-list li {
  margin-bottom: 0.5rem;
}

.help-link {
  color: var(--color-primary, #667eea);
  text-decoration: none;
  font-weight: 500;
}

.help-link:hover {
  text-decoration: underline;
}

.help-note {
  margin: 0;
  padding: 0.75rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--color-text, #4a5568);
  line-height: 1.5;
}

.api-landing__footer {
  text-align: center;
}

.footer-text {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
}

.footer-link {
  color: white;
  text-decoration: underline;
  font-weight: 500;
}

.footer-link:hover {
  text-decoration: none;
}

@media (max-width: 640px) {
  .api-landing {
    padding: 1rem;
  }

  .api-landing__title {
    font-size: 1.75rem;
  }

  .api-landing__subtitle {
    font-size: 1rem;
  }

  .api-landing__features {
    grid-template-columns: 1fr;
  }

  .api-landing__setup {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
