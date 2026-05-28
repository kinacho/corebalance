# Roadmap heurístico de importación CSV para CoreBalance (sin IA)

> Objetivo: que **corebalance.app** pueda entender la gran mayoría de CSVs de posiciones / operaciones de brokers, usando solo heurísticas (sin APIs de IA), apoyándose en tu pipeline actual de `csv-utils.ts`, `parsers.ts` y `ColumnMapper.svelte`.[file:50]

---

## 0. Situación actual

### 0.1 Arquitectura de importación

Actualmente tienes:[file:50]

- `parseCSV(text)` en `csv-utils.ts`:
  - Detecta delimitador, parsea líneas y devuelve `{ headers, rows, delimiter }`.
- `ALL_DETECTORS` en `parsers.ts`:
  - Detectores específicos: `degiro`, `trading212`, `ib`, `myinvestor`.
  - Un `genericDetector` para CSV genéricos.
  - Cada detector implementa:
    - `detect(headers): number` → confianza 0..1.
    - `parse(headers, rows): ParsedPosition[]`.
- `importFromCSV(fileContent)`:
  - Llama a `parseCSV`.
  - Elige el detector con mayor confianza.
  - Ejecuta `parse` y devuelve `ImportResult`.
- `importWithMapping(fileContent, mapping)`:
  - Vuelve a hacer `parseCSV`.
  - Usa `MappingConfig` (shares, isin, ticker, name, avgCost, currency) para construir `ParsedPosition[]` y agregarlos.
- `ColumnMapper.svelte`:
  - Muestra columnas detectadas.
  - Permite mapear cada columna a un rol (ISIN, ticker, cantidad, etc.).
  - Tiene un auto‑mapeo simple basado en cabeceras (normalización básica).

### 0.2 Limitaciones

- Los detectores específicos funcionan muy bien para los brokers soportados.
- El `genericDetector` es frágil cuando:
  - Las cabeceras no siguen patrones esperados.
  - El CSV es de **operaciones** en vez de posiciones.
- El usuario acaba usando `ColumnMapper` con poca ayuda cuando el CSV es “raro”.

**Objetivo del roadmap:**  
Construir un motor heurístico de detección de columnas y tipos de CSV reutilizable, de forma que:

- El parser genérico se apoye en él.
- `ColumnMapper` llegue ya muy rellenado.
- Se recuerden mappings por tipo de CSV para futuros imports.

---

## 1. Refuerzo del parsing base de CSV

### 1.1 Detección de cabecera

Añadir una detección de “fila de cabecera” basada en tipos de columnas.[web:112][web:114]

**Plan:**

1. Analizar las primeras 5–10 filas (`rows[0..9]`).
2. Para cada columna:
   - Detectar tipo dominante: numérico, fecha, texto.
3. Marcar `rows[0]` como cabecera si:
   - Gran parte de sus celdas son “texto no numérico”.
   - Y el tipo dominante en filas 1–5 para esa columna es numérico / fecha.

Implementar en `csv-utils.ts`:

```ts
export function detectHeaderRow(rows: string[][]): { hasHeader: boolean; headerRowIndex: number } {
  // Si hay muy pocas filas, asumir header en la primera
  if (rows.length < 2) return { hasHeader: true, headerRowIndex: 0 };

  // Heurístico sencillo: comparar tipos de la fila 0 con filas 1..N
  // (numérico vs texto vs fecha)
}
```

Modificar `parseCSV` para usar este resultado al construir `headers` y `rows`.

### 1.2 Normalización centralizada

Crear funciones reutilizables en `csv-utils.ts` (o un archivo nuevo de utils):

```ts
export function normalizeHeaderName(raw: string): string {
  return raw
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCurrency(value: string): string | null {
  const v = value.trim().toUpperCase();
  if (!v) return null;
  if (/^[A-Z]{3}$/.test(v)) return v; // EUR, USD, GBP...
  if (/€|eur/.test(v)) return 'EUR';
  if (/\$|usd/.test(v)) return 'USD';
  return v;
}
```

Reemplazar las normalizaciones dispersas en `parsers.ts` y `ColumnMapper.svelte` por estas funciones comunes.

---

## 2. Motor de análisis de columnas

La idea es que, para cualquier CSV, puedas responder: “La columna 2 parece ISIN con score 0.9, la 3 parece cantidad, etc.”.

### 2.1 Tipos de columna

Definir tipos y estructuras:

```ts
export type ColumnRole =
  | 'isin'
  | 'ticker'
  | 'name'
  | 'quantity'
  | 'price'
  | 'currency'
  | 'date'
  | 'ignored';

export interface ColumnAnalysis {
  index: number;
  header: string;
  normalizedHeader: string;
  sampleValues: string[];
  roleScores: Partial<Record<ColumnRole, number>>; // 0..1
}
```

### 2.2 Heurísticos por rol

#### ISIN

Propiedades clave:[web:107][web:110]

- 12 caracteres alfanuméricos.
- Primeros 2 = país (letras), siguientes 9 alfanum, último dígito check.

Helper:

```ts
export function looksLikeIsinValue(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(v)) return false;
  if (!/^[A-Z]{2}/.test(v)) return false;
  return true;
}
```

Score:

- +0.6 si `normalizedHeader` contiene `isin`.
- +0.4 si >80 % de `sampleValues` válidos pasan `looksLikeIsinValue`.

#### Ticker

Características:

- Cabecera: `ticker`, `symbol`, `sym`, `epic`, etc.
- Valores: 1–8 caracteres, solo letras/números/puntos/guiones, no parecen ISIN.

Helper:

```ts
function looksLikeTickerValue(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (!v) return false;
  if (!/^[A-Z0-9.\-]+$/.test(v)) return false;
  if (v.length > 8) return false;
  if (looksLikeIsinValue(v)) return false;
  return true;
}
```

Score:

- +0.5 si header contiene `ticker|symbol|sym|epic`.
- +0.5 si mayoría de valores pasan `looksLikeTickerValue`.

#### Quantity (shares)

Pistas:

- Header: `shares`, `qty`, `quantity`, `units`, `cantidad actual`, `position`, etc.
- Valores: casi todos numéricos, generalmente ≥ 0.

Score:

- +0.4 si header contiene términos anteriores.
- +0.4 si >80 % de sampleValues son numéricos.
- +0.2 si mediana de la columna es “grande” comparada con precios (ver más abajo).

#### Price / avg cost

Pistas:

- Header: `price`, `precio`, `avg`, `average`, `cost`, `unit price`, `precio medio`.
- Valores: numéricos > 0, rango típicamente menor que cantidad.

Score:

- +0.4 si header encaja.
- +0.3 si >80 % numéricos y mediana < mediana de columna candidateada como `quantity`.
- +0.3 si muchos valores llevan símbolo de moneda (puedes usarlo como “precio con divisa”).

#### Currency

Pistas:

- Header: `currency`, `divisa`, `cur`, `moneda`.
- Valores: 3 letras (`EUR`, `USD`, etc.) o símbolos.

Score:

- +0.6 si header encaja.
- +0.4 si >80 % valores son 3 letras o símbolos convertibles con `normalizeCurrency`.

#### Name

Pistas:

- Header: `name`, `description`, `asset`, `security`, `nombre`, `descripcion`.
- Valores: textos largos con espacios, no numéricos.

Score:

- +0.4 si header encaja.
- +0.6 si la mayoría de valores parecen texto (≥ 2 palabras, con espacios).

#### Date

Pistas:

- Header: `date`, `fecha`, `trade date`, `settlement`.
- Valores: parseables como fecha.

Score:

- +0.5 si header encaja.
- +0.5 si >80 % de valores parseables como fecha.

### 2.3 Implementar `analyzeColumns`

Firma:

```ts
export function analyzeColumns(headers: string[], rows: string[][]): ColumnAnalysis[] {
  const sampleRows = rows.slice(0, 50);
  // construir ColumnAnalysis para cada columna
}
```

Para cada columna:

1. `header` = `headers[i]`.
2. `normalizedHeader` = `normalizeHeaderName(header)`.
3. `sampleValues` = primeras N celdas no vacías de esa columna.
4. `roleScores`:
   - Llamar a funciones `scoreIsin`, `scoreTicker`, `scoreQuantity`, etc.
   - Cada una devuelve un número 0..1.

---

## 3. Generar un `MappingConfig` “mejor esfuerzo”

Tienes ya un `MappingConfig` usado por `ColumnMapper` y `importWithMapping`.[file:50]

```ts
export interface MappingConfig {
  shares: number;
  isin?: number;
  ticker?: number;
  name?: number;
  avgCost?: number;
  currency?: number;
}
```

### 3.1 Elegir la mejor columna por rol

Implementa:

```ts
export function suggestMappingFromAnalysis(analysis: ColumnAnalysis[]): MappingConfig {
  const pickBest = (role: ColumnRole): number => {
    const candidates = analysis
      .map(col => ({ index: col.index, score: col.roleScores[role] ?? 0 }))
      .filter(c => c.score > 0.25)
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) return -1;

    const [best, second] = candidates;
    if (second && best.score - second.score < 0.1) {
      // empate → mejor forzar confirmación manual
      return -1;
    }

    return best.index;
  };

  return {
    shares: pickBest('quantity'),
    isin: pickBest('isin'),
    ticker: pickBest('ticker'),
    name: pickBest('name'),
    avgCost: pickBest('price'),
    currency: pickBest('currency')
  };
}
```

### 3.2 Usar el mapping sugerido en el parser genérico

En `genericDetector.parse(headers, rows)` sustituir la lógica actual por:

```ts
const analysis = analyzeColumns(headers, rows);
const mapping = suggestMappingFromAnalysis(analysis);
return parseWithMapping(headers, rows, mapping);
```

Donde `parseWithMapping` reutiliza la misma lógica que tu `importWithMapping`, pero dentro de `parsers.ts`.

---

## 4. Integración con `ColumnMapper.svelte`

Queremos que el usuario llegue a `ColumnMapper` con casi todo ya seleccionado.

### 4.1 Props extendidas

En `ColumnMapper.svelte`, definir props:

```ts
interface Props {
  headers: string[];
  rows: string[][];
  onConfirm: (mapping: MappingConfig) => void;
  onBack: () => void;
  initialMapping?: Partial<MappingConfig>;
  mappingScore?: number;      // 0..1, score global
}
```

### 4.2 Inicializar mapping con sugerencia

```ts
let { headers, rows, onConfirm, onBack, initialMapping, mappingScore }: Props = $props();

let mapping = $state<MappingConfig>({
  shares: initialMapping?.shares ?? -1,
  isin: initialMapping?.isin ?? -1,
  ticker: initialMapping?.ticker ?? -1,
  name: initialMapping?.name ?? -1,
  avgCost: initialMapping?.avgCost ?? -1,
  currency: initialMapping?.currency ?? -1
});
```

En el efecto de auto‑mapeo existente, solo rellenar campos si siguen a `-1`.

### 4.3 Mostrar un resumen de confianza

Añadir un bloque:

```svelte
{#if mappingScore !== undefined}
  <p class="mapping-score">
    Cobertura estimada: {Math.round(mappingScore * 100)}%. 
    Revisa las columnas si algo no te cuadra.
  </p>
{/if}
```

Opcionalmente, colorear según score (<60 % amarillo, >80 % verde).

---

## 5. Detección de “positions vs transactions” (opcional)

Muchos CSVs son históricos de operaciones; puedes reconstruir posiciones finales a partir de ellos.

### 5.1 Clasificar el CSV

Añadir en `analyzeColumns` una heurística global:

- Si hay columnas `date`, `price`, `quantity` y:
  - Tickers se repiten muchas veces.
  - Existe una columna `type`/`operation` con valores tipo `BUY/SELL/DIV`.

→ marcar `kind = 'transactions'`.

Si no, `kind = 'positions'`.

### 5.2 Modelo de `Transaction` y agregación

Definir:

```ts
interface Transaction {
  ticker?: string;
  isin?: string;
  name?: string;
  quantity: number;
  price: number;
  currency?: string;
  date?: Date;
  type: 'buy' | 'sell' | 'dividend' | 'other';
}
```

Implementar `aggregateTransactionsToPositions(txs: Transaction[]): ParsedPosition[]`:

- Para cada instrumento (por ISIN o ticker):
  - `totalShares` = sumatoria buy − sell.
  - `totalCost` = acumulación coste medio ponderado.
  - `avgCost` = `totalCost / totalShares`.
- Ignorar dividendos para la posición (aunque podrías usarlos para métricas futuras).

Usar esta función cuando `kind = 'transactions'` pero el usuario elija “Quiero importar como posiciones agregadas”.

---

## 6. Plantillas de mapping por tipo de CSV (memoria por usuario)

Incluso con heurísticas fuertes, muchos usuarios importarán **el mismo formato** de CSV repetidamente.

### 6.1 Firma de plantilla de CSV

Calcular una `signature` estable:

```ts
interface CsvSignature {
  headerHash: string;
  columnCount: number;
  valueShapeHash: string;
}
```

Por ejemplo:

- `headerHash` = hash de `normalizedHeaderName` de todas las columnas.
- `valueShapeHash` = hash de:
  - Tipos de las primeras N filas (`numeric/text/date` por columna).

### 6.2 Persistir mapping final

Cuando el usuario confirme un mapping:

- Guardar en tu storage (Firestore, etc.) algo como:

```ts
{
  userId,
  signature,
  mapping: MappingConfig,
  createdAt
}
```

### 6.3 Reutilizar en imports futuros

Cuando se importe un CSV:

1. Calcular `signature`.
2. Buscar mapping guardado para `userId + signature`.
3. Si existe:
   - Usarlo directamente.
   - O pasarlo como `initialMapping` a `ColumnMapper` con un texto tipo:
     - “Hemos aplicado el mismo mapping que la última vez para un CSV similar”.

---

## 7. Validaciones adicionales antes de aceptar el import

Antes de confirmar la importación:

1. Verificar que:

   - Hay al menos `shares` y `ticker` o `isin` mapeados.
   - La mayoría de filas no vacías producen `ParsedPosition` con valores numéricos válidos.
   - Si hay `isin`, que todas las celdas de esa columna que no están vacías pasan `looksLikeIsinValue`.[web:107][web:110]

2. Calcular métricas:

   - Número de filas totales.
   - Número de filas importadas.
   - Número de filas descartadas.

3. Mostrar al usuario:

   - Un resumen corto: “Se importarán 124 filas, se descartan 3 por datos inválidos.”
   - Un listado de 2–3 ejemplos de filas descartadas, para que pueda decidir si le preocupa.

---

## 8. Orden recomendado de implementación

1. **Utils base**:
   - `normalizeHeaderName`, `looksLikeIsinValue`, tipos numéricos, detección de cabecera.
2. **Motor de análisis**:
   - `analyzeColumns(headers, rows)` + heurísticos por rol.
3. **Generación de mapping**:
   - `suggestMappingFromAnalysis`.
   - Ajustar `genericDetector` para usarlo.
4. **Integración con `ColumnMapper`**:
   - Añadir `initialMapping` y `mappingScore`.
   - Respetar campos ya mapeados (no sobreescribirlos).
5. **Clasificación positions/transactions** (opcional).
   - Si lo haces, implementar `Transaction` + `aggregateTransactionsToPositions`.
6. **Plantillas por CSV**:
   - `signature` por CSV.
   - Guardar y reutilizar mapping confirmado.
7. **Validaciones y UX final**:
   - Resumen de cobertura, filas descartadas, avisos de posibles problemas.