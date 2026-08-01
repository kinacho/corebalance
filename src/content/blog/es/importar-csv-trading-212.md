---
title: "Importar el CSV de Trading 212 en CoreBalance: guía paso a paso"
description: "Cómo exportar tu historial de órdenes de Trading 212 a CSV e importarlo en CoreBalance: detección automática, precio medio ponderado y multi-divisa."
summary:
  - "Trading 212 permite exportar el historial a CSV; CoreBalance detecta el formato automáticamente por sus cabeceras (Action, ISIN, No. of shares, Price / share…)."
  - "El importador procesa las órdenes de compra y venta, las ordena cronológicamente y reconstruye cada posición con su precio medio ponderado de compra."
  - "Las filas de depósitos, dividendos o intereses no se importan como transacciones: se listan como omitidas con su motivo, para que nada se pierda en silencio."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [trading 212, importar, csv, etfs]
lang: es
canonical: "https://corebalance.app/blog/importar-csv-trading-212"
ogImage: "/blog/og/importar-csv-trading-212.jpg"
slugs: { es: 'importar-csv-trading-212', en: 'import-trading-212-csv' }
---

Trading 212 se ha convertido en uno de los brókers favoritos de los inversores indexados europeos: sin comisiones de compraventa, con acciones fraccionadas y con una función de "Pies" que facilita la aportación periódica. Lo que no trae de serie es una vista clara de **cuánto pesa cada activo respecto a tu objetivo** ni una calculadora que te diga dónde aportar el mes que viene.

Ahí es donde encaja CoreBalance: exportas tu historial de órdenes a CSV, lo importas, y la app reconstruye tus posiciones con su precio medio de compra para que puedas [rebalancear tu cartera indexada](/blog/como-rebalancear-cartera-indexada) con aportaciones, sin vender nada. En esta guía vemos el proceso completo y, sobre todo, **qué hace exactamente el importador con tus datos** — sin magia ni promesas vagas.

---

## 1. Por qué importar el historial en lugar de teclear posiciones

Puedes añadir tus activos a mano en CoreBalance, claro. Pero si llevas meses (o años) haciendo aportaciones periódicas en Trading 212, tu posición real es la suma de decenas de compras pequeñas a precios distintos, muchas de ellas fraccionadas. Calcular a mano el precio medio ponderado de todo eso es tedioso y propenso a errores.

Importando el CSV consigues:

* **Precio medio de compra exacto**, calculado a partir de cada orden real.
* **Participaciones fraccionadas respetadas** tal cual las exporta Trading 212 (el importador no redondea a unidades enteras).
* **Ventas descontadas correctamente**: una venta reduce participaciones y coste de forma proporcional, sin alterar el precio medio de lo que conservas.

Todo el proceso ocurre **en tu navegador**: el CSV no se sube a ningún servidor.

---

## 2. Cómo exportar el historial de Trading 212 a CSV

Trading 212 permite exportar el historial de la cuenta a CSV desde la propia app o desde la web. A grandes rasgos (la interfaz cambia de vez en cuando, así que tómalo como orientación):

1. Entra en tu cuenta de Trading 212 (app móvil o web).
2. Ve al **historial** de la cuenta (sección *History*).
3. Busca la opción de **exportar** (icono de descarga/compartir).
4. Selecciona el **rango de fechas** — idealmente desde tu primera operación — y asegúrate de incluir las **órdenes** (*Orders*). Puedes incluir también dividendos y transacciones de caja; no estorban.
5. Genera el CSV y descárgalo (según la versión, te lo descarga directamente o te lo envía por correo).

El fichero resultante tiene cabeceras en inglés como `Action`, `Time`, `ISIN`, `Ticker`, `Name`, `No. of shares`, `Price / share`, `Currency (Price / share)` o `Exchange rate`. Son precisamente esas cabeceras las que CoreBalance usa para reconocer el formato.

---

## 3. Importar el CSV en CoreBalance

1. Abre el [dashboard de CoreBalance](/dashboard) y pulsa el botón de **importar CSV**.
2. Selecciona el fichero. El detector de Trading 212 comprueba las cabeceras contra una lista de marcadores del formato (`Action`, `No. of shares`, `Price / share`, `ISIN`, `Ticker`, `Exchange rate`, `Stamp duty`…). Si coinciden suficientes, verás el aviso de **"Trading 212 detectado"** y el parseo es automático.
3. Revisa la lista de posiciones reconstruidas, desmarca las que no quieras importar y elige la **categoría de destino** (núcleo, satélite o acciones).
4. CoreBalance resuelve cada **ISIN a un ticker cotizable** para poder traer precios en vivo, y al confirmar crea los activos nuevos (con peso objetivo 0%, que ajustas después) o actualiza las participaciones de los que ya tuvieras.

### ¿Y si no detecta el fichero automáticamente?

Si la detección automática no alcanza confianza suficiente (por ejemplo, un CSV muy recortado o editado), CoreBalance no se rinde: te ofrece un **mapeo manual de columnas**, donde tú indicas qué columna es la cantidad, cuál el precio, cuál el ISIN, etc. Es el mismo mecanismo que usa para CSVs genéricos de cualquier otro origen.

---

## 4. Qué hace exactamente el parser con tus filas

Esto es lo que ocurre por dentro, verificable en el código del importador:

* **Solo procesa órdenes de compra y venta**: cualquier `Action` que contenga *buy* o *sell* (Market buy, Limit buy, Market sell, Limit sell…). El resto de filas se omiten de forma explícita.
* De cada orden lee **ISIN, ticker, nombre, número de participaciones, precio por participación, divisa del precio y fecha** (columna `Time`). Las filas sin ISIN válido o con cantidad cero se descartan y quedan registradas con su motivo.
* Ordena todas las transacciones **cronológicamente** y las consolida por activo con el método del **coste medio ponderado**: cada compra suma participaciones y coste; cada venta resta participaciones y reduce el coste total de forma proporcional al precio medio previo (la venta no cambia el precio medio de lo que queda).
* Entiende tanto el formato numérico **europeo (1.234,56) como el americano (1,234.56)**.
* **Multi-divisa**: cada posición conserva la divisa original del CSV (Trading 212 exporta a menudo precios en USD o GBP). Al valorar la cartera, CoreBalance aplica el tipo de cambio correspondiente para que todo —valor actual y coste medio— se muestre en tu divisa base en euros.

### ¿Qué pasa con los dividendos, depósitos e intereses del CSV?

No se importan como transacciones: el parser de Trading 212 solo convierte compras y ventas. Esas filas aparecen en el **resumen de filas omitidas**, cada una con su motivo, para que sepas exactamente qué se ha quedado fuera. Si llevas el registro fino de dividendos, puedes anotarlos después a mano en el ledger de transacciones de CoreBalance, donde reducen el coste medio de la posición.

### ¿Por qué no aparece un activo que vendí por completo?

Porque es lo correcto: si tras reproducir todo tu historial una posición queda a cero participaciones, el importador **no la incluye** en el resultado. Solo se importan posiciones vivas, que son las que afectan al rebalanceo.

---

## 5. Problemas comunes

* **"ISIN inválido"** en varias filas: suele tratarse de filas que no son órdenes de valores (ajustes, efectivo). Revisa el detalle de omitidas; si una orden real aparece ahí, comprueba que la columna ISIN no se haya corrompido al abrir el CSV en Excel.
* **El CSV editado ya no se detecta**: si abres y guardas el fichero con una hoja de cálculo, puede cambiar delimitadores o cabeceras. Usa el fichero original de Trading 212 o recurre al mapeo manual.
* **Exportaste solo los últimos meses**: el precio medio saldrá mal porque faltan compras antiguas. Exporta desde tu primera operación.
* **Un ISIN no se resuelve a ticker**: puede pasar con activos muy exóticos; puedes asignar el ticker a mano o añadir el activo manualmente.

---

## 6. Después de importar: pesos objetivo y rebalanceo

Con las posiciones cargadas, queda lo importante: asigna a cada activo su **peso objetivo** (los importados entran con 0%) y deja que CoreBalance calcule las desviaciones. Como Trading 212 trabaja con [ETFs y no con fondos indexados traspasables](/blog/fondos-indexados-vs-etfs-espana), la estrategia sensata en España es rebalancear **solo con aportaciones nuevas**, dirigiendo cada compra al activo más rezagado — y decidir [cuándo rebalancear](/blog/cuando-rebalancear-cartera) con calendario o bandas de tolerancia, no por impulso.

Si tu cartera es del estilo "un solo ETF mundial", quizá te interese también la comparativa [IWDA vs VWCE](/blog/iwda-vs-vwce-comparativa), dos de los ETFs más comprados precisamente en Trading 212.

> [!TIP]
> Guarda el CSV que exportaste. Si más adelante quieres reimportar desde cero o auditar una cifra, tener el histórico original completo te ahorra volver a pelearte con los filtros de exportación del bróker.
