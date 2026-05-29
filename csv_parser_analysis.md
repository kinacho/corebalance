# Análisis de Robustez del Motor de Parseo CSV

Tras revisar en profundidad la implementación actual en `csv-utils.ts` y `parsers.ts`, el motor cuenta con una base excelente:
- Detección automática de delimitadores (`,`, `;`, `\t`).
- Heurísticas avanzadas para tipado de columnas (detectar ISINs, fechas, numéricos europeos/americanos).
- Sistema de firma (`signature`) para recordar mapeos manuales de los usuarios.
- Detectores específicos (ej: DEGIRO) para casos con lógica de negocio compleja (como los *Stock Splits*).

Sin embargo, para alcanzar un nivel **Enterprise / "Bulletproof"** y soportar a todos los grandes brókers europeos e internacionales, el sistema actual tiene ciertas limitaciones que deben abordarse.

---

## 1. Soporte para Archivos Multi-Tabla (El caso Interactive Brokers)

**Problema Actual:**
La función `detectHeaderRow` y `parseCSV` asumen que el archivo CSV contiene **una única tabla** de datos con una cabecera principal en la parte superior. 
Brókers de nivel pro como **Interactive Brokers (IBKR)** exportan *Activity Statements* y *Flex Queries* que contienen múltiples tablas en un mismo archivo (ej. una sección para "Trades", otra para "Corporate Actions", otra para "Dividends"), todas separadas por líneas en blanco y con distintas cabeceras.

**Solución Propuesta:**
- Implementar un pre-procesador que divida el archivo en "Bloques de Datos" separados por saltos de línea dobles.
- Aplicar `detectHeaderRow` a cada bloque individualmente.
- Permitir que los `BrokerDetector` reciban una lista de bloques en lugar de un solo array de filas, para que puedan extraer información de "Trades" y sumarla a "Corporate Actions".

## 2. Estandarización del Historial Cronológico (Cálculo FIFO / Coste Medio)

**Problema Actual:**
El parser de transacciones (como el de DEGIRO) acumula compras y ventas sobre la marcha (`existing.shares += sharesRaw`). Esto funciona para saldos netos de acciones, pero:
1. Ignora la fecha de la transacción. Si el CSV está ordenado de más reciente a más antiguo, las operaciones matemáticas se aplican en orden inverso.
2. Para calcular correctamente el **Precio Medio de Compra (Average Cost)**, las ventas no deben reducir el coste medio unitario de manera directa, sino reducir la base de coste proporcionalmente o usar algoritmos FIFO (First In, First Out). Actualmente se suman o restan todos los importes netos, lo cual distorsiona el coste medio final si ha habido muchas compras y ventas intermedias.

**Solución Propuesta:**
- El parser no debería acumular matemáticamente durante la lectura del archivo. En su lugar, debería extraer un array estandarizado de objetos `Transaction { date, type (BUY/SELL/SPLIT), asset, shares, price, currency }`.
- Una vez extraídas todas las transacciones, ordenarlas cronológicamente de más antigua a más reciente.
- Aplicar una función pura `reduceTransactionsToPositions(transactions)` que aplique las reglas contables correctamente (ej. FIFO para calcular ganancias realizadas y aislar el verdadero precio de compra de las acciones que aún mantenemos).

## 3. Complejidad en Eventos Corporativos (Corporate Actions)

**Problema Actual:**
Hemos parcheado los *Stock Splits* para DEGIRO usando expresiones regulares sobre la columna `Descripción` (`/STOCK SPLIT:\s*([\d.]+)/i`). 
Esto es frágil a largo plazo. Otros brókers usan términos como "Spinoff", "Merger", "Reverse Split", "Symbol Change", o simplemente anotan la entrada de los nuevos activos sin precio de compra y retiran los antiguos, a veces en fechas distintas.

**Solución Propuesta:**
- Crear un clasificador unificado de Eventos Corporativos en el parser transaccional.
- Si un bróker reporta una salida masiva de acciones de un ISIN y una entrada masiva de acciones de otro ISIN sin flujo de caja (o con flujo neto cero), emparejarlas automáticamente como un evento de canje.
- En caso de un Ticker Change (ej. Facebook a Meta), el parser debe ser capaz de fusionar las posiciones antiguas con las nuevas basándose en fechas.

## 4. Ampliación del Ecosistema de Detectores (Brókers Objetivo)

Para ser verdaderamente robusto, necesitamos ir más allá de DEGIRO y el Mapeo Genérico. Se deben construir objetos `BrokerDetector` específicos comprobando las "firmas" típicas (nombres de cabecera exactos) de los siguientes brókers:

1. **Interactive Brokers (IBKR):** Formato Flex Query multisección.
2. **MyInvestor:** Bróker español popular. Usa CSV europeo (`;` delimitador, `,` decimal) pero a veces sus exportaciones omiten ISINs en ciertas columnas.
3. **Trade Republic / Scalable Capital:** Tienen formatos muy peculiares; a menudo el usuario usa extractos fiscales que hay que saber destripar.
4. **XTB:** Su historial exporta columnas muy específicas (`Open price`, `Close price`, `Symbol`). El Generic se suele liar si hay posiciones en corto porque resta acciones directamente.
5. **eToro:** Exporta un *Account Statement* con múltiples pestañas (suelen ser Excel, por lo que el usuario tendrá que guardarlo como CSV). Hay que manejar criptomonedas y acciones fraccionarias con alta precisión (6 a 8 decimales).

## 5. Telemetría de Errores y "Skipped Rows"

**Problema Actual:**
El sistema actual devuelve `skippedRows: number`. Si se saltan 15 filas, el usuario no sabe si eran filas vacías, depósitos de efectivo, comisiones sueltas, si un ISIN estaba mal formateado, o si era una acción que ha desaparecido por error.

**Solución Propuesta:**
- Modificar la interfaz `ImportResult` para incluir un array de `skippedDetails: { rowNumber: number, rawData: string, reason: string }[]`.
- En la interfaz gráfica (`ImportModal.svelte`), añadir un botón "Ver filas omitidas" para que, si el usuario nota que le falta un activo, pueda abrir el listado y ver rápidamente el porqué (ej. "Línea 42: No se encontró cantidad numérica válida").

## Resumen del Plan de Acción Técnico

Si queremos implementar estas mejoras y dar el salto de calidad, sugiero este orden:

1. **Fase 1: Transparencia UI.** Añadir el desglose de filas descartadas en el modal para dar confianza absoluta al usuario cuando un activo no aparece.
2. **Fase 2: Arquitectura Transaccional.** Refactorizar `degiroDetector` (y futuros parsers de histórico) para extraer objetos `Transaction` en vez de acumular directamente. Implementar `aggregateTransactions(txs)` con cálculo estricto de Coste Medio (FIFO).
3. **Fase 3: Motor Multi-tabla.** Modificar `csv-utils.ts` para detectar bloques separados por líneas en blanco y exponer `parseCSVBlocks()` de cara a soportar IBKR.
4. **Fase 4: Expansión Horizontal.** Añadir detectores específicos para MyInvestor, IBKR y XTB, consiguiendo CSVs de muestra de cada plataforma para afinar las heurísticas.
