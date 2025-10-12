const API_BASE_URL = 'https://api.g2.galactictycoons.com'

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
    const response = await fetch(`${API_BASE_URL}/public/exchange/mat-prices`)
    
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
