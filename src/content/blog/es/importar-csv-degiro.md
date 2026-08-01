---
title: "Cómo importar tu CSV de DEGIRO a CoreBalance paso a paso"
description: "Guía para importar tus transacciones de DEGIRO a CoreBalance desde un CSV: qué archivo exportar, cómo se detecta y cómo se calcula tu precio medio."
summary:
  - "CoreBalance reconoce automáticamente los CSV de DEGIRO en tres formatos (transacciones, estado de cuenta y cartera); el de transacciones es el más fiable."
  - "El importador ordena tus operaciones por fecha y calcula el precio medio ponderado de compra; las ventas reducen la posición sin alterar ese precio medio."
  - "El archivo se procesa localmente en tu navegador: solo se consultan los ISIN contra el servidor para resolver el ticker de mercado de cada activo."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [degiro, importar, csv, cartera]
lang: es
canonical: "https://corebalance.app/blog/importar-csv-degiro"
ogImage: "/blog/og/importar-csv-degiro.jpg"
slugs: { es: 'importar-csv-degiro', en: 'import-degiro-csv' }
---

Si llevas años operando en DEGIRO, teclear tu cartera a mano en cualquier herramienta es un castigo: decenas de compras, ventas parciales, algún split... y una errata en el precio medio lo desbarata todo. Por eso CoreBalance incluye un **importador de CSV que entiende los ficheros de exportación de DEGIRO** y reconstruye tus posiciones por ti.

En esta guía te contamos qué archivo descargar del bróker, cómo importarlo en el [dashboard](/dashboard) y —porque nos gusta ser transparentes— qué hace exactamente el código del importador con tus datos.

---

## ¿Qué CSV de DEGIRO debo descargar?

**El de Transacciones.** Es el formato con columnas más limpias (fecha, hora, producto, ISIN, cantidad y precio) y el que permite a CoreBalance reconstruir tu precio medio de compra con mayor fiabilidad. Los otros dos formatos también funcionan, pero con matices.

DEGIRO ofrece tres exportaciones distintas y CoreBalance las reconoce las tres:

1. **Transacciones** — en la web de DEGIRO suele estar en el apartado de actividad u operaciones, con un botón de exportar a CSV eligiendo el rango de fechas. Cada fila es una operación con su fecha, hora, producto, ISIN, cantidad y precio. **Es la opción recomendada**: exporta desde tu primera operación hasta hoy.
2. **Estado de cuenta** (el clásico `Account.csv`) — el extracto contable completo: ingresos, retiradas, comisiones, dividendos, cambios de divisa... y, entre medias, tus compras y ventas descritas como texto libre ("Compra 10 Vanguard FTSE All-World@105,20 EUR (IE00BK5BQT80)"). CoreBalance sabe extraer las operaciones de ese texto e ignora el resto de apuntes, pero es un formato más frágil. Como ventaja exclusiva, es el único que recoge los **stock splits**.
3. **Cartera** (snapshot de posiciones) — una foto de lo que tienes hoy: producto, ISIN, cantidad y precio de cierre. Sirve para arrancar rápido, pero **el coste que se importa se aproxima a partir del valor actual**, no de tus compras reales, así que tu precio medio no será el histórico.

Ten en cuenta que la interfaz de DEGIRO cambia de vez en cuando: los nombres exactos de los menús pueden variar, pero las tres exportaciones llevan años disponibles.

---

## Cómo importar el archivo en CoreBalance

El proceso completo lleva menos de un minuto:

1. Abre el [dashboard de CoreBalance](/dashboard) y entra en la gestión de activos.
2. Pulsa la opción de **importar** y arrastra tu CSV a la zona de subida (o selecciónalo con el botón). Se aceptan archivos `.csv`, `.tsv` y `.txt` de hasta 1 MB.
3. CoreBalance **detecta automáticamente que el archivo es de DEGIRO** analizando las cabeceras de las columnas. No tienes que decirle de qué bróker viene.
4. Los ISIN de tus posiciones se resuelven a tickers de mercado para poder traer cotizaciones en vivo. El CSV en sí **no se sube a ningún servidor**: el análisis ocurre en tu navegador y solo viajan los ISIN para esa resolución.
5. Revisa la vista previa: verás cada posición con sus participaciones y precio medio, podrás desmarcar las que no quieras importar y elegir en qué categoría de la cartera entran.

¿Y si la detección automática falla? Existe un **mapeo manual de columnas** como red de seguridad: tú indicas qué columna es el ISIN, cuál la cantidad, cuál el precio... y CoreBalance recuerda ese mapeo para la próxima vez que subas un archivo con la misma estructura.

---

## Qué hace exactamente el importador (verificado en el código)

Nada de magia opaca; esto es lo que hace el parser de DEGIRO:

- **Cabeceras en tres idiomas.** Reconoce las columnas en español, inglés y neerlandés: `Fecha/Date/Datum`, `Hora/Time/Tijd`, `Producto/Product`, `ISIN`, `Cantidad/Número/Aantal/Quantity`, `Precio/Price/Koers`, `Descripción/Description/Omschrijving`. Los acentos y mayúsculas dan igual.
- **Fechas europeas.** Entiende los formatos `DD-MM-YYYY` y `DD/MM/YYYY` (con hora opcional) que usa DEGIRO.
- **Compras y ventas por signo.** En el CSV de transacciones, una cantidad positiva se interpreta como compra y una negativa como venta.
- **Extracto de cuenta por texto.** En el estado de cuenta, extrae las operaciones del campo de descripción con el patrón "Compra/Venta N Producto@Precio DIVISA (ISIN)", también en inglés (Buy/Sell) y neerlandés (Koop/Verkoop). Los apuntes que no son operaciones —depósitos, comisiones, dividendos, cambios de divisa— se descartan, y el importador te muestra cuántas filas se omitieron y por qué.
- **Precio medio ponderado.** Todas las operaciones se ordenan cronológicamente y se reducen a posiciones: cada compra acumula participaciones y coste, y el precio medio resultante es el coste total dividido por las participaciones. Las **ventas reducen la posición proporcionalmente sin cambiar el precio medio** de lo que queda, que es el criterio contable estándar. Las posiciones totalmente vendidas desaparecen del resultado.
- **Validación de ISIN.** Solo se aceptan ISIN con formato válido (2 letras + 9 caracteres alfanuméricos + dígito de control); las filas sin identificador fiable se omiten y se reportan.

---

## Problemas comunes al importar

- **El delimitador.** DEGIRO usa comas, pero muchos CSV europeos usan punto y coma o tabulador. CoreBalance **detecta el delimitador automáticamente** entre `,`, `;` y tabulador, así que no necesitas tocar el archivo.
- **Decimales con coma.** El parser numérico entiende tanto el formato europeo (`1.234,56`) como el americano (`1,234.56`), y también precios "sucios" con símbolos de divisa o letras pegadas.
- **Divisas.** Cada posición conserva la divisa de compra que figura en el CSV (EUR, USD...). Después, el dashboard obtiene los tipos de cambio junto con las cotizaciones para valorar toda la cartera de forma homogénea.
- **Abrir el CSV en Excel antes de importarlo.** Evítalo: Excel puede reescribir fechas y decimales al guardar. Importa el archivo tal cual lo descarga DEGIRO.

## ¿Por qué mi precio medio no coincide exactamente con el de DEGIRO?

**Porque el importador calcula el precio medio solo con precio × participaciones de cada operación, sin sumar las comisiones de compra**, y DEGIRO puede incluirlas en su coste medio. La diferencia suele ser de céntimos por participación. Además, si importaste el snapshot de cartera en lugar del historial, el coste se aproximó desde el valor actual, no desde tus compras reales; en ese caso, reimportar el CSV de transacciones lo corrige. Y recuerda que los dividendos no se importan como operaciones: si cobras [dividendos de tus ETFs en DEGIRO](/blog/dividendos-etfs-degiro), esos apuntes se omiten deliberadamente.

---

## Después de importar: de los datos al rebalanceo

Con las posiciones dentro, queda lo importante:

1. **Asigna los pesos objetivo.** Los activos importados entran con peso objetivo 0%; define tu asignación (por ejemplo, la clásica de [fondos indexados frente a ETFs](/blog/fondos-indexados-vs-etfs-espana) que hayas elegido para tu cartera).
2. **Deja que lleguen los precios.** CoreBalance refresca las cotizaciones automáticamente tras la importación.
3. **Calcula tu próxima aportación.** Introduce cuánto vas a invertir este mes y la calculadora repartirá la compra hacia los activos infraponderados, [sin vender nada](/blog/como-rebalancear-cartera-indexada) y sin generar impuestos.

Si operas con ETFs en DEGIRO, esta mecánica de aportaciones es especialmente relevante: te contamos por qué en nuestra guía de [rebalanceo en DEGIRO con ETFs](/blog/rebalanceo-degiro-etfs).

> [!TIP]
> Guarda el CSV que exportaste. Si en el futuro quieres reconstruir la cartera en otro dispositivo (los datos de CoreBalance viven en tu navegador), reimportarlo son dos clics.
