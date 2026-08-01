---
title: "Importar el CSV de Interactive Brokers en CoreBalance: guía completa"
description: "Guía paso a paso para importar tu Activity Statement CSV de Interactive Brokers en CoreBalance: detección automática, multidivisa y coste medio."
summary:
  - "CoreBalance reconoce el Activity Statement CSV multibloque de IBKR (filas Header/Data por sección) y también exports de una sola tabla con columnas tipo Symbol, Quantity y Price."
  - "Si el archivo contiene un bloque de operaciones (Trades), reconstruye cada posición con su coste medio ponderado; si solo hay posiciones, importa el snapshot con su Average Cost."
  - "Cada posición conserva su divisa de cotización (USD, EUR...); la conversión a tu divisa base se hace con el tipo de cambio actual del mercado, no con el histórico de cada compra."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [interactive brokers, importar, csv, etfs]
lang: es
canonical: "https://corebalance.app/blog/importar-csv-interactive-brokers"
ogImage: "/blog/og/importar-csv-interactive-brokers.jpg"
slugs: { es: 'importar-csv-interactive-brokers', en: 'import-interactive-brokers-csv' }
---

Interactive Brokers (IBKR) es el bróker preferido de muchos inversores europeos por sus comisiones bajas y su acceso a bolsas de medio mundo. Su punto débil es conocido: los informes. Entre TWS, el portal web y las Flex Queries, IBKR ofrece media docena de formas de exportar tus datos, y ninguna está pensada para copiarla a mano en una calculadora de cartera.

CoreBalance incluye un importador de CSV con un detector específico para Interactive Brokers. En esta guía te contamos qué archivo descargar, cómo funciona la importación y —con total honestidad— qué hace y qué no hace el parser, para que sepas exactamente qué esperar.

---

## 1. Por qué importar en lugar de teclear

Si tienes tres ETFs, escribir participaciones y precio medio a mano es trivial. Pero si llevas años operando en IBKR, con compras mensuales, alguna venta y activos en varias divisas, reconstruir tu **precio medio de compra real** a mano es tedioso y propenso a errores.

El importador hace ese trabajo por ti: lee tus operaciones históricas, las ordena cronológicamente y calcula el coste medio ponderado de cada posición. Y como CoreBalance es local-first, **el archivo se procesa en tu navegador**: tu CSV no se sube a ningún servidor.

---

## 2. Qué informe descargar de Interactive Brokers

IBKR tiene varios formatos de exportación y su interfaz cambia con frecuencia, así que toma estos pasos como orientativos:

1. Entra en el portal web de IBKR (Client Portal).
2. Ve a la sección de informes o extractos (**Performance & Reports → Statements** o similar, según la versión de la interfaz).
3. Genera un **Activity Statement** del periodo que quieras importar (idealmente desde que abriste la cuenta, para que el coste medio salga completo).
4. Descárgalo en formato **CSV** (no PDF).

Ese Activity Statement en CSV es un archivo peculiar: no es una tabla única, sino un documento **multibloque** donde cada línea empieza con el nombre de la sección ("Trades", "Open Positions", "Dividends"...) seguido de un marcador `Header` o `Data`. Es justo el formato para el que está preparado el importador.

### ¿Qué formatos de export de IBKR reconoce CoreBalance?

CoreBalance reconoce dos tipos de export de IBKR: el **Activity Statement CSV multibloque** (líneas con marcadores `Header`/`Data` por sección) y los **exports de tabla única** —como una Flex Query o un export de TWS— siempre que incluyan columnas reconocibles como *Symbol*, *Position*, *Market Value*, *Average Cost*, *Cost Basis*, *Asset Class* o *Conid* (para posiciones), o *Symbol*, *Date/Time*, *Quantity*, *T. Price*, *Proceeds* y *Comm/Fee* (para operaciones). Si tu export usa otras columnas, no se detectará como IBKR, pero podrás importarlo igualmente con el mapeo manual de columnas.

---

## 3. Importar el archivo en CoreBalance

1. Abre el [dashboard](/dashboard) de CoreBalance.
2. Abre el importador de CSV y selecciona (o arrastra) el archivo descargado.
3. CoreBalance analiza las cabeceras de todos los bloques del archivo y, si encuentra los marcadores de IBKR, aplica el detector de Interactive Brokers automáticamente.
4. Verás una **vista previa** con las posiciones detectadas: nombre, participaciones y coste medio en su divisa original. Ahí puedes desmarcar lo que no quieras importar y elegir a qué categoría de tu cartera van los activos nuevos.
5. Confirma, y CoreBalance resolverá cada ISIN o símbolo a un ticker de mercado para poder traer precios en vivo.

Si la detección automática falla (confianza baja o cero posiciones extraídas), CoreBalance recurre a un importador genérico y, como último recurso, te ofrece el **mapeo manual**: tú indicas qué columna es la cantidad, cuál el precio, cuál el ISIN, etc.

---

## 4. Qué hace exactamente el parser (verificado en el código)

Para que no haya sorpresas, esto es lo que hace el importador de IBKR, ni más ni menos:

- **Trocea el archivo en secciones.** Detecta el estilo multibloque de IBKR (columna 2 con `Header`/`Data`) y agrupa las filas por sección: Trades, Open Positions, Dividends...
- **Extrae ISINs de todo el documento.** IBKR no siempre incluye una columna ISIN en el bloque de operaciones, así que el parser escanea *todos* los bloques buscando columnas ISIN y patrones `SÍMBOLO (ISIN)` en cualquier celda de texto (por ejemplo, en las descripciones de dividendos). Con eso construye un mapa símbolo → ISIN.
- **Prioriza las operaciones sobre las posiciones.** Si hay un bloque *Trades* (o uno con columnas de símbolo y cantidad), lee cada operación: símbolo, cantidad, precio (*T. Price*), divisa y fecha. Cantidad positiva = compra; negativa = venta.
- **Calcula el coste medio ponderado.** Ordena las operaciones por fecha y las consolida: las compras acumulan coste; las ventas reducen participaciones y coste de forma proporcional **sin alterar el precio medio** de las que quedan (el criterio contable correcto para el coste medio).
- **Si no hay operaciones, usa el snapshot.** Sin bloque de trades, importa directamente las posiciones abiertas con su *Average Cost* (o *Cost Basis Per Share*).
- **Entiende ambos formatos numéricos.** `1,234.56` (americano) y `1.234,56` (europeo) se interpretan correctamente.

También hay que decir lo que **no** hace: la columna *Comm/Fee* no se lee, así que **el coste medio calculado no incluye comisiones**. Y las filas de dividendos no se importan como transacciones (solo se usan para extraer ISINs); si quieres reflejar dividendos en tu coste, tendrás que añadirlos a mano en el ledger.

### ¿Cómo maneja CoreBalance las divisas si opero en USD y EUR?

Cada posición importada **conserva su divisa de cotización**: un ETF comprado en dólares mantiene su coste medio en USD (si el CSV no indica divisa, el parser asume USD, la divisa por defecto de IBKR). Para mostrar tu cartera en tu divisa base, CoreBalance aplica el **tipo de cambio actual** que obtiene junto con los precios de mercado, no el tipo histórico de cada compra. Si necesitas registrar el cambio exacto de una operación concreta, puedes hacerlo añadiendo esa transacción manualmente en el ledger, que sí admite un `fxRate` por transacción.

---

## 5. Problemas comunes

- **"Solo se ha importado una parte de mis activos".** Revisa el periodo del Activity Statement: si generaste el informe de un solo año, faltarán las compras anteriores y el coste medio saldrá incompleto.
- **Fechas raras.** El parser interpreta la columna *Date/Time* con el motor de fechas del navegador. Si una fecha no se puede interpretar, la fila **no se descarta**: se importa con la fecha de hoy. Esto solo afecta al orden cronológico, que importa si has hecho ventas.
- **Filas omitidas.** Las filas sin símbolo o con cantidad cero se saltan, y el importador registra el motivo de cada descarte para que puedas revisarlo.
- **Posiciones cerradas.** Si compraste y vendiste todo un activo, el resultado neto es cero participaciones y esa posición no se importa (correcto: ya no la tienes).

---

## 6. Después de importar: del CSV al rebalanceo

Con las posiciones dentro, la rutina es la de siempre: asigna un **peso objetivo** a cada activo, y CoreBalance calculará la desviación de cada posición con precios en vivo. A partir de ahí, cada aportación nueva se reparte hacia lo más infraponderado —el método de [rebalanceo por aportaciones](/blog/como-rebalancear-cartera-indexada) que evita vender y tributar, especialmente relevante si inviertes en ETFs, que [no tienen traspaso exento](/blog/fondos-indexados-vs-etfs-espana) en España.

Dos lecturas útiles para configurar tu cartera tras la importación: [cuándo conviene rebalancear](/blog/cuando-rebalancear-cartera) (bandas de tolerancia frente a calendario) y, si tienes ETFs de reparto en IBKR, la comparativa [acumulación vs distribución](/blog/msci-world-acc-vs-dist).

> [!TIP]
> Guarda el CSV original. Si más adelante detectas un descuadre en el precio medio, poder re-importar desde el archivo completo (todo el histórico) es la forma más rápida de corregirlo.
