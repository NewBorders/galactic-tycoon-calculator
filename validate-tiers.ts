// Validation script to check all materials have tier property
import { MATERIALS } from './src/data/materials/index'

console.log('🔍 Validating materials tier property...\n')

let totalMaterials = 0
let materialsWithTier = 0
let materialsWithoutTier: string[] = []

for (const [key, material] of Object.entries(MATERIALS)) {
  totalMaterials++
  
  if (material.tier !== undefined && material.tier >= 1 && material.tier <= 4) {
    materialsWithTier++
  } else {
    materialsWithoutTier.push(`${key} (id: ${material.id})`)
  }
}

console.log(`✅ Materials with tier: ${materialsWithTier}/${totalMaterials}`)

if (materialsWithoutTier.length > 0) {
  console.log(`\n❌ Materials without tier or invalid tier:`)
  materialsWithoutTier.forEach(mat => console.log(`  - ${mat}`))
} else {
  console.log('\n✨ All materials have valid tier property!')
}

// Show tier distribution
const tierDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 }
for (const material of Object.values(MATERIALS)) {
  if (material.tier >= 1 && material.tier <= 4) {
    tierDistribution[material.tier as 1 | 2 | 3 | 4]++
  }
}

console.log('\n📊 Tier Distribution:')
console.log(`  Tier 1: ${tierDistribution[1]} materials`)
console.log(`  Tier 2: ${tierDistribution[2]} materials`)
console.log(`  Tier 3: ${tierDistribution[3]} materials`)
console.log(`  Tier 4: ${tierDistribution[4]} materials`)
