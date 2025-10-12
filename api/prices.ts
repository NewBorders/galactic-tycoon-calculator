import type { VercelRequest, VercelResponse } from '@vercel/node'

const API_BASE_URL = 'https://api.g2.galactictycoons.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/public/exchange/mat-prices`)

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const data = await response.json()
    
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching prices:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch prices',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
