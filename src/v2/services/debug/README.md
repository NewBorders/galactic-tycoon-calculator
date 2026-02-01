# Debug Logging System

Ein einfaches, performantes Debug-Logging-System für Galactic Tycoon Calculator, das:
- ✅ **Standardmäßig aus** ist (OFF) - keine Performance-Einbußen in Production
- ✅ **Module-basiert** - nur bestimmte Services debuggen
- ✅ **Level-basiert** - TRACE, DEBUG, INFO, WARN, ERROR
- ✅ **localStorage-gesteuert** - Einstellung bleiben über Reload erhalten
- ✅ **Einfach zu verwenden** - `createLogger('ModuleName')`

## Verwendung

### In Code integrieren

```typescript
import { createLogger } from '@/v2/services/debug/logger'

const logger = createLogger('SyncService')

// Diese Logs erscheinen nur wenn Debug aktiviert
logger.debug('Loading bases from API')
logger.info('Total bases: ' + count)
logger.warn('Sync took longer than expected')
logger.error('Failed to load API data:', error)
logger.trace('Detailed trace information')
```

### Im Browser aktivieren

Öffne die Browser-Konsole (F12) und verwende die globale `__gt_debug` API:

```javascript
// Alle Logs einschalten
__gt_debug.setLevel('DEBUG')
__gt_debug.setModules('*')

// Nur bestimmte Services debuggen
__gt_debug.setModules('SyncService,StateReversion,PlayerBases')

// Aktuelle Konfiguration anschauen
__gt_debug.getConfig()
// { level: 'DEBUG', modules: ['SyncService', 'StateReversion'] }

// Settings zurücksetzen
__gt_debug.setLevel('OFF')
__gt_debug.setModules('')
```

## Log-Level

| Level | Beschreibung | Wann angezeigt |
|-------|--------------|---|
| **OFF** | Keine Logs | Standard in Production |
| **ERROR** | Nur Fehler | Immer angezeigt |
| **WARN** | Fehler + Warnungen | Immer angezeigt |
| **INFO** | + Informationen | Wenn Module aktiviert |
| **DEBUG** | + Debug-Details | Wenn Module aktiviert |
| **TRACE** | + Trace-Details | Wenn Module aktiviert |

## Praktische Beispiele

### Debug-Sitzung starten

```javascript
// Alle Logs für Sync Service
__gt_debug.setLevel('DEBUG')
__gt_debug.setModules('SyncService')
// Jetzt in Console die API-Aufrufe sehen

// Nachdem Problem gelöst, ausschalten
__gt_debug.setLevel('OFF')
```

### Problem mit State Reversion debuggen

```javascript
__gt_debug.setLevel('DEBUG')
__gt_debug.setModules('StateReversion')
// Jetzt alle Undo/Redo-Operationen sehen
```

### Performance-Messung

Die Einstellung bleibt über Browser-Reloads erhalten (localStorage), bis man sie zurücksetzt.

## Implementation im Code

### Für bestehende console.log Statements

Alte Logs ersetzen durch `createLogger`:

```typescript
// Alt:
console.log('[SyncService] Loaded bases:', bases)

// Neu:
const logger = createLogger('SyncService')
logger.debug('Loaded bases:', bases)
```

### Best Practices

1. **Modulname als Prefix verwenden** - `'SyncService'`, `'StateReversion'`, `'PlayerBases'`
2. **Strukturierte Logs** - Objekte/Arrays ausgeben für bessere Inspizierbarkeit
3. **Richtige Level verwenden**:
   - `error()` - nur für echte Fehler
   - `warn()` - für unerwartete Situationen
   - `info()` - für wichtige Statusmeldungen  
   - `debug()` - für Debugging während Entwicklung
   - `trace()` - für detaillierte Ausführungsflows

## Technische Details

- **Default**: OFF in Production, DEBUG in Development
- **Performance**: Logger-Calls mit OFF-Level haben praktisch Zero-Overhead
- **localStorage Keys**:
  - `gt_debug_level` - Aktueller Log-Level
  - `gt_debug_modules` - Kommagetrennte Liste von Modulen oder '*' für alle
- **Automatische Initialisierung** - In Development wird `window.__gt_debug` global verfügbar gemacht
