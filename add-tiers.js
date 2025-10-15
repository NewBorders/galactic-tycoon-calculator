// Script to add tier property to all materials based on the JSON data
const fs = require('fs');
const path = require('path');

// Material tiers from the JSON
const materialTiers = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 1, 8: 1, 9: 2, 10: 1,
  11: 1, 12: 1, 13: 2, 14: 4, 15: 2, 16: 1, 17: 1, 18: 2, 19: 3, 20: 3,
  21: 2, 22: 3, 23: 4, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 2,
  31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 2, 37: 1, 38: 1, 39: 1, 40: 3,
  41: 1, 42: 1, 43: 1, 44: 1, 45: 2, 46: 2, 47: 1, 48: 1, 49: 1, 50: 1,
  51: 2, 52: 1, 53: 1, 54: 1, 55: 2, 56: 2, 57: 1, 58: 1, 59: 2, 60: 2,
  61: 2, 62: 2, 63: 2, 64: 1, 65: 2, 66: 1, 67: 3, 68: 1, 69: 2, 70: 4,
  71: 2, 72: 2, 73: 3, 74: 2, 75: 3, 76: 3, 77: 3, 78: 3, 79: 2, 80: 4,
  81: 3, 82: 2, 83: 2, 84: 1, 85: 3, 86: 2, 87: 1, 88: 2, 89: 2, 90: 2,
  91: 2, 92: 1, 93: 1, 94: 3, 95: 4, 96: 3, 97: 3, 98: 1, 99: 2, 100: 3,
  101: 2, 102: 2, 103: 2, 104: 1, 105: 2, 106: 2, 107: 2, 108: 1, 109: 2, 110: 1,
  111: 2, 112: 2, 113: 1, 114: 4, 115: 3, 116: 3, 117: 2, 118: 2, 119: 3, 120: 3,
  121: 4, 122: 2, 123: 2, 124: 2, 125: 2, 126: 2, 127: 3, 128: 2, 129: 2, 130: 2,
  131: 2, 132: 2, 133: 3, 134: 3, 135: 3, 136: 3, 137: 3, 138: 4, 139: 3, 140: 3,
  141: 3, 142: 3, 143: 2, 144: 4, 145: 3, 146: 3, 147: 3, 148: 3, 149: 4, 150: 4,
  151: 4, 152: 4, 153: 3, 154: 3, 155: 3, 156: 2, 157: 3, 158: 2, 159: 4, 160: 4,
  161: 3, 162: 4, 163: 4, 164: 4, 165: 3, 166: 4, 167: 4, 168: 2, 169: 3, 170: 4,
  171: 4, 172: 4, 173: 4, 174: 4, 175: 3
};

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  
  // Find all material definitions with id property
  const regex = /(\{[^}]*id:\s*(\d+)[^}]*\})/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[1];
    const id = parseInt(match[2]);
    const tier = materialTiers[id];
    
    if (tier && !fullMatch.includes('tier:')) {
      // Add tier property before the closing brace
      const newMatch = fullMatch.replace(/\}$/, `, tier: ${tier} }`);
      modified = modified.replace(fullMatch, newMatch);
    }
  }
  
  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`✓ Updated ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

// Process all material files
const materialsDir = path.join(__dirname, 'src', 'data', 'materials');
const files = [
  'processed.ts',
  'manufactured.ts',
  'food.ts',
  'consumables.ts',
  'spaceship.ts'
];

console.log('Adding tier property to materials...\n');

let updated = 0;
files.forEach(file => {
  const filePath = path.join(materialsDir, file);
  if (fs.existsSync(filePath)) {
    if (processFile(filePath)) {
      updated++;
    }
  } else {
    console.log(`✗ File not found: ${file}`);
  }
});

console.log(`\nCompleted! ${updated} files updated.`);
