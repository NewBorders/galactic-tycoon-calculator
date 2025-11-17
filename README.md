# Galactic Tycoons - Production Calculator

A web-based production calculator and planning tool for the game **Galactic Tycoons**.

## 🚀 Features

- **Production Planning**: Calculate material inputs/outputs for your production buildings
- **Economic Analysis**: Track costs, revenue, and profit
- **Worker Management**: Calculate worker consumption and productivity bonuses
- **Stock Management**: Track inventory levels and time until resources run out
- **Price Configuration**: Import prices from game clipboard, lock prices to prevent updates
- **Technology Levels**: Configure technology bonuses for each industry type
- **Advanced Filtering**: Filter materials by name, tier, and category
- **Data Persistence**: All data is automatically saved to browser localStorage
- **Multi-column Layout**: Organized material lists with color-coded categories

## 📦 Installation

### Prerequisites
- Node.js 20.19.0 or higher
- npm or pnpm

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd calculadora-produccion

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# type checks
npm run type-check
npm run lint
```

## 🎮 How to Use

### 1. Configure Prices & Stock
- Click on "Prices & Stock" accordion
- Paste stock data directly from game clipboard
- Paste prices data from game clipboard
- Use 🔒 icon to lock prices and prevent import updates
- Filter materials by category, tier, or search by name

### 2. Add Production Buildings
- Click on "Production Buildings" accordion
- Click "Add Building" button
- Select building type and configure recipes
- Adjust quantities and planet modifiers (for mines)

### 3. Configure Technology & Game Speed
- Click "Show Settings"
- Adjust game speed multiplier
- Set technology levels for each industry type
- Enable optional worker consumables (ale, pie, workwear)

### 4. Analyze Production
- View economic summary (costs, revenue, profit)
- Check worker consumption and requirements
- Monitor net balance (production vs consumption)
- See time until stock depletion

## 🎨 Material Categories

Materials are color-coded by industry:
- 🟡 **Resource Extraction** - Raw materials from mines and collectors
- ⚪ **Metallurgy** - Refined metals and alloys
- 🔵 **Chemistry** - Chemical compounds and polymers
- 🟢 **Agriculture** - Crops, livestock, and organic materials
- 🟩 **Food Production** - Processed food products
- ⚫ **Manufacturing** - Tools, equipment, and components
- 🟠 **Construction** - Building materials and kits
- 🔷 **Electronics** - Circuits, computers, and electronics
- 🟣 **Science** - Research data and AI systems

## 💾 Data Management

All configuration is automatically saved to browser localStorage:
- Buildings and recipes
- Prices and stock levels
- Locked prices
- Technology levels
- Game speed settings
- Optional consumables status

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Game Information

This calculator is designed for **Galactic Tycoons** game. All game data, materials, buildings, and recipes are property of the game developers.

## GDPR
All data is stored locally, so no one BUT you have access to it, not even the Devs.
We also store API Key if user wishes to have player data from the game.

**How long is data and API Key stored?** Forever, user can always delete browser cache. 
**Who can access the data?** No one but the user or tools the user allows to use its localStorage
**What is it used for?** The API Key is used to get player's information about: Bases, Buildings, Recipes
**What access level is needed?** Currently "limited" is fine, since we don't need transaction history, for now.
