# Rate Limiting Analysis: Market Analysis Refresh

## Problem
HTTP 429 "Too Many Requests" beim Aufruf von:
```
GET https://api.g2.galactictycoons.com/public/exchange/mat-details?apikey=<myAPIKey>
```

## Rate Limiting Rules
Quelle: https://wiki.galactictycoons.com/api/overview#rate-limiting

### API Endpoint Kosten
Laut Wiki hat jeder API-Aufruf unterschiedliche "Punkte":
- **GET /public/exchange/mat-details** = **2 Punkte**

### Rate Limits
- **Authenticated Requests (mit API key)**: 100 Punkte pro Minute
- **Unauthenticated Requests**: 10 Punkte pro Minute

### Reset Window
- Punkte werden jede Minute zurückgesetzt
- Der Reset-Zeitpunkt wird in Response-Header `X-RateLimit-Reset` angegeben

---

## Market Analysis: "Refresh" Button Analysis

### Was passiert bei einem Klick auf "Refresh"?

#### Code-Analyse (`MarketAnalysisPanel.vue`):
```typescript
async function refresh() {
  await fetch(true)  // forceRefresh = true
}
```

#### Composable (`useMarketAnalysis.ts`):
```typescript
async function fetch(forceRefresh = false) {
  // ...
  const result = await fetchMarketAnalysis({ world, forceRefresh })
  // ...
}
```

#### Repository (`repository.ts`):
```typescript
export async function fetchMarketAnalysis(opts: FetchOptions): Promise<MarketAnalysis> {
  // Extract
  const { data: rawMaterials } = await extractMarketDetails(apiKey, opts.world, opts.forceRefresh)
  
  // Transform
  const opportunities = transformToOpportunities(rawMaterials)
  
  // Load/Return
  return {
    opportunities,
    stats: { /* ... */ }
  }
}
```

#### Extractor (`extractor.ts`):
```typescript
export async function extractMarketDetails(
  apiKey: string,
  world: World = 'g2',
  forceRefresh = false,
): Promise<{ data: MaterialDetailsRaw[]; source: 'api' | 'cache' }> {
  // Check cache first (1 minute TTL)
  if (!forceRefresh && cached && isCacheValid(cached.ts, 60_000)) {
    return { data: cached.data, source: 'cache' }
  }

  // API Call
  const url = new URL(`${baseUrl}/public/exchange/mat-details`)
  url.searchParams.set('apikey', apiKey)
  const response = await fetch(url.toString())  // ← HIER: 1 API Call
  // ...
}
```

---

## **ERGEBNIS: Rate Limit Berechnung**

### Bei einem Klick auf "Refresh":

| Action | API Calls | Punkte pro Call | Gesamt Punkte |
|--------|-----------|-----------------|---------------|
| GET /public/exchange/mat-details | **1** | **2** | **2** |

### **Antwort:**
✅ **1 API Call = 2 Punkte**

---

## Warum trotzdem 429 Error?

### Mögliche Ursachen:

1. **Mehrfaches Refresh in kurzer Zeit**
   - Wenn du innerhalb von 1 Minute mehrmals auf Refresh klickst
   - Beispiel: 50 Refreshes = 100 Punkte → Limit erreicht

2. **Andere parallele Requests**
   - Andere Tabs/Features der App nutzen dasselbe API Key
   - Beispiel: Prices API, Warehouse API, etc.

3. **Cache wird umgangen**
   - Der "Refresh" Button setzt `forceRefresh = true`
   - Das umgeht den 1-Minuten-Cache
   - Jeder Klick = echter API Call

4. **Shared API Key**
   - Wenn mehrere User denselben API Key nutzen
   - Punkte werden pro Key, nicht pro User gezählt

---

## Empfohlene Lösungen

### 1. **UI Feedback bei Refresh**
Zeige dem User, wenn gerade gecached wird:
```vue
<button @click="refresh" :disabled="loading">
  {{ source === 'cache' ? '✅ Cached (1m)' : '🔄 Refresh' }}
</button>
```

### 2. **Rate Limit Headers auslesen**
Implementiere Feedback aus Response-Headers:
```typescript
const response = await fetch(url.toString())
const remaining = response.headers.get('X-RateLimit-Remaining')
const reset = response.headers.get('X-RateLimit-Reset')

console.log(`Remaining: ${remaining} points`)
console.log(`Reset at: ${new Date(Number(reset) * 1000)}`)
```

### 3. **Längere Cache-TTL**
Erhöhe den Cache von 1 Minute auf 5 Minuten:
```typescript
const CACHE_CONFIG = {
  MARKET_DETAILS_TTL_MS: 5 * 60 * 1000, // 5 minutes
}
```

### 4. **Exponential Backoff bei 429**
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`)
}
```

### 5. **Disable Refresh Button temporär**
```typescript
const lastRefresh = ref<number>(0)
const canRefresh = computed(() => Date.now() - lastRefresh.value > 60_000)
```

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| API Calls pro Refresh | **1** |
| Punkte pro Refresh | **2** |
| Max Refreshes pro Minute | **50** (100 Punkte / 2 Punkte) |
| Aktueller Cache TTL | 1 Minute |
| Empfohlener Cache TTL | 5 Minuten |

**Fazit:** Ein einzelner Refresh ist sehr günstig (nur 2 Punkte). Der 429 Error entsteht wahrscheinlich durch:
- Mehrfaches schnelles Refreshen
- Parallele API Calls von anderen Features
- Geteilter API Key zwischen mehreren Usern

**Beste Lösung:** Erhöhe Cache TTL auf 5 Minuten und zeige dem User den Cache-Status an.
