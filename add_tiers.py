import re
import os

# Material tiers from the JSON
material_tiers = {
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
}

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = content
    
    # Find all material definitions
    # Pattern: { id: NUMBER, name: ..., category: ..., weight: ... }
    pattern = r'\{\s*id:\s*(\d+),([^}]*)\}'
    
    def replacer(match):
        id_str = match.group(1)
        rest = match.group(2)
        material_id = int(id_str)
        tier = material_tiers.get(material_id)
        
        # Check if tier already exists
        if tier and 'tier:' not in rest:
            # Add tier before the closing brace
            return f'{{ id: {id_str},{rest}, tier: {tier} }}'
        return match.group(0)
    
    modified = re.sub(pattern, replacer, content)
    
    if modified != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified)
        print(f'✓ Updated {os.path.basename(file_path)}')
        return True
    else:
        print(f'- No changes needed for {os.path.basename(file_path)}')
    return False

# Process all material files
materials_dir = r'C:\dev\galactictycoons\calculadora-produccion\src\data\materials'
files = [
    'processed.ts',
    'manufactured.ts',
    'food.ts',
    'consumables.ts',
    'spaceship.ts'
]

print('Adding tier property to materials...\n')

updated = 0
for file in files:
    file_path = os.path.join(materials_dir, file)
    if os.path.exists(file_path):
        if process_file(file_path):
            updated += 1
    else:
        print(f'✗ File not found: {file}')

print(f'\nCompleted! {updated} files updated.')
