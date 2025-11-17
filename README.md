# Galactic Tycoons - Production Calculator

A web-based production calculator and planning tool for the game **Galactic Tycoons**.

## 🎯 Game Information

This calculator is designed for **Galactic Tycoons** game. All game data, materials, buildings, and recipes are property of the game developers.

## 🚀 Features / USPs

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


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💾 GDPR
All data is stored locally, so no one BUT you have access to it, not even the Devs.
We also store API Key if user wishes to have player data from the game.

**How long is data and API Key stored?** Forever, user can always delete browser cache. 
**Who can access the data?** No one but the user or tools the user allows to use its localStorage
**What is it used for?** The API Key is used to get player's information about: Bases, Buildings, Recipes
**What access level is needed?** Currently "limited" is fine, since we don't need transaction history, for now.
