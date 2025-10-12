// Use our proxy API route in production, direct API in development
const API_URL = import.meta.env.DEV 
  ? 'https://api.g2.galactictycoons.com/public/exchange/mat-prices'
  : '/api/prices'

export interface MaterialPrice {
  matId: number
  matName: string
  currentPrice: number
  avgPrice: number
}

export interface PricesApiResponse {
  prices: MaterialPrice[]
}

export async function fetchMaterialPrices(): Promise<MaterialPrice[]> {
  try {
    const response = await fetch(API_URL)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: PricesApiResponse = await response.json()
    return data.prices
  } catch (error) {
    console.error('Error fetching material prices:', error)
    throw error
  }
}
