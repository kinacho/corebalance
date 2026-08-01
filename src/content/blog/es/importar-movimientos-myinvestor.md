---
title: "Cómo importar tus movimientos de MyInvestor a CoreBalance (CSV)"
description: "Guía paso a paso para exportar tus movimientos de fondos indexados de MyInvestor e importarlos en CoreBalance con detección automática del CSV."
summary:
  - "CoreBalance detecta automáticamente los CSV de movimientos de MyInvestor por sus cabeceras (nombre del fondo, ISIN, participaciones, importe, estado) y calcula tu precio medio ponderado."
  - "El importador procesa suscripciones, reembolsos, compras, ventas, aportaciones y traspasos de entrada y salida, e ignora las órdenes que no estén finalizadas o ejecutadas."
  - "Si la detección automática falla, puedes mapear las columnas manualmente y CoreBalance recuerda ese mapeo para futuros archivos con la misma estructura."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [myinvestor, importar, csv, fondos-indexados]
lang: es
canonical: "https://corebalance.app/blog/importar-movimientos-myinvestor"
ogImage: "/blog/og/importar-movimientos-myinvestor.jpg"
slugs: { es: 'importar-movimientos-myinvestor', en: 'import-myinvestor-csv' }
---

Si llevas años haciendo aportaciones mensuales a tus fondos indexados en MyInvestor, reconstruir tu cartera a mano en cualquier herramienta es un suplicio: decenas de suscripciones, algún traspaso, quizá algún reembolso puntual. En esta guía verás cómo **exportar tus movimientos de MyInvestor e importarlos en CoreBalance en un par de minutos**, qué hace exactamente el importador con tu archivo y qué revisar cuando algo no cuadra.

Como siempre en CoreBalance, todo el proceso ocurre **en tu navegador**: el CSV no se sube a ningún servidor.

---

## 1. Por qué importar en lugar de teclear

Podrías limitarte a copiar el valor actual de cada fondo, y para calcular un rebalanceo puntual eso basta. Pero al importar tus movimientos reales ganas dos cosas:

* **Tu precio medio ponderado real.** CoreBalance reconstruye tus posiciones a partir de las operaciones, en orden cronológico, con el mismo método de coste medio que verías en tu bróker.
* **Cero errores de transcripción.** Con 40 o 50 aportaciones acumuladas, un dedo bailado en una cifra pasa desapercibido durante meses.

Si estás montando tu primera cartera indexada, quizá te interese antes la guía de la [cartera Bogleheads para principiantes en España](/blog/cartera-bogle-principiantes-espana).

---

## 2. Cómo exportar tus movimientos desde MyInvestor

MyInvestor no tiene un botón único de "exportar todo", y **su interfaz cambia con cierta frecuencia**, así que toma estos pasos como orientación general:

1. Inicia sesión en la **web** de MyInvestor (desde ordenador suele ser más cómodo que desde la app para descargar archivos).
2. Ve a la sección de **Inversiones > Fondos de inversión** y entra en el detalle de tus posiciones o en el histórico de **órdenes/movimientos**.
3. Busca la opción de **descargar o exportar** el listado. Según la pantalla, MyInvestor ofrece el archivo en formato CSV o Excel.
4. Si solo te ofrece **Excel (.xlsx)**, ábrelo y guárdalo como **CSV** antes de importarlo: CoreBalance lee archivos CSV, con separador de coma o de punto y coma (el punto y coma es el habitual en los exports españoles y se detecta automáticamente).

Lo importante es que el archivo final contenga, en columnas, al menos: **el nombre del fondo o su ISIN, las participaciones, el importe y la fecha** de cada operación. Una columna de "Estado" y otra de "Tipo de operación" ayudan a afinar el resultado, como verás ahora.

---

## 3. Importar el CSV en CoreBalance

1. Abre el [dashboard de CoreBalance](/dashboard) y entra en la gestión de activos.
2. Pulsa el botón de **importar CSV** y arrastra tu archivo.
3. CoreBalance analiza las cabeceras y, si reconoce el formato de MyInvestor con confianza suficiente, pasa directamente a la **vista previa** de posiciones.
4. Los ISIN se resuelven automáticamente a tickers con cotización, para que los precios se actualicen solos a partir de ese momento.
5. Revisa la lista, desmarca lo que no quieras traer, asigna la categoría (núcleo, satélite o acciones) y confirma.

### ¿Qué pasa si CoreBalance no reconoce mi archivo?

**Nada grave: entra en juego el mapeo manual de columnas.** Si la detección automática no alcanza confianza suficiente, CoreBalance te muestra las columnas de tu archivo para que indiques tú cuál es el nombre, el ISIN, las participaciones y el precio o importe. Ese mapeo **se guarda en tu navegador asociado a la estructura del archivo**, de modo que la próxima vez que importes un CSV con las mismas columnas se aplica solo. Además, si el detector específico se equivoca y no logra extraer nada, existe un importador genérico de respaldo que intenta interpretar la tabla por heurísticas.

---

## 4. Qué hace exactamente el importador con tu CSV

Esto no es marketing: es lo que hace el código, línea a línea.

* **Detección:** el detector de MyInvestor busca en las cabeceras marcadores como *nombre del fondo, ISIN, participaciones, valor liquidativo, importe, fecha de la orden o estado*. Con tres o más coincidencias, la confianza es alta y se salta el mapeo manual.
* **Filtro por estado:** si el archivo tiene columna **Estado**, solo se procesan las filas **finalizadas o ejecutadas**. Las órdenes pendientes o canceladas se descartan (y se listan como filas omitidas, con su motivo).
* **ISIN obligatorio:** cada fila necesita un ISIN válido. Si no hay columna de ISIN pero el código aparece dentro del nombre del fondo, el importador **lo extrae del propio texto**. Sin ISIN, la fila se omite.
* **Tipos de operación:** se interpretan como *aumento* de posición las filas cuyo tipo contiene **suscripción, compra, aportación o entrada**; y como *disminución* las que contienen **reembolso, venta o salida**. Un traspaso queda cubierto por sus dos patas: "traspaso entrada" y "traspaso salida". Si no hay columna de tipo pero la fila tiene participaciones y estado finalizado, se asume que es una compra.
* **Precio por participación:** si tu archivo trae una columna de precio o coste medio, se usa; si no, se calcula como **importe ÷ participaciones**. Los formatos numéricos europeos (1.234,56 €) y las fechas DD/MM/AAAA se interpretan correctamente, y el importe se asume en euros.
* **Agregación en coste medio ponderado:** todas las operaciones se ordenan cronológicamente y se reducen a una posición por ISIN. Las compras suman participaciones y coste; las ventas restan participaciones y reducen el coste total **proporcionalmente, sin alterar el precio medio** de lo que queda. Las posiciones que acaban a cero no se importan.

El resultado son tus **posiciones consolidadas** (participaciones + precio medio), que se cargan como holdings de tu cartera.

---

## 5. El caso especial de MyInvestor: traspasos entre fondos

Los traspasos son la operación estrella del inversor indexado español, porque permiten [rebalancear en MyInvestor sin pagar impuestos](/blog/rebalanceo-myinvestor-sin-impuestos). Y tienen una peculiaridad al importarlos que conviene entender.

### ¿Cómo trata CoreBalance los traspasos al importar?

**Cada traspaso se procesa por sus dos patas: la salida se resta del fondo de origen y la entrada se suma al fondo de destino, al valor liquidativo de la fecha del traspaso.** Es la forma correcta de reconstruir cuántas participaciones tienes y a qué precio medio *operativo* entraste en cada fondo.

> [!IMPORTANT]
> Ese precio medio es el **operativo**, no el **fiscal**. En España, los [traspasos entre fondos conservan a efectos de Hacienda el precio y la fecha de adquisición originales](/blog/traspasos-fondos-indexados-hacienda); tu bróker es quien custodia ese dato fiscal. CoreBalance es una herramienta de rebalanceo y seguimiento, no un sustituto del informe fiscal de tu entidad.

Además, una vez importada la cartera, el libro de transacciones del dashboard incluye un tipo de operación **traspaso** (`transfer`) junto a compra, venta y dividendo: al registrar la pata de entrada de un traspaso futuro, las participaciones y su coste se incorporan a tu posición igual que una compra al valor liquidativo de ese día.

---

## 6. Problemas comunes

* **"Se han omitido varias filas".** Casi siempre son órdenes no finalizadas, filas sin ISIN o filas con cero participaciones. CoreBalance te muestra el detalle de cada fila omitida y el motivo; revísalo antes de asumir que falta algo.
* **El archivo es .xlsx.** Guárdalo como CSV desde Excel o LibreOffice. El separador (coma o punto y coma) da igual: se detecta solo.
* **Detecta otro bróker o no detecta nada.** Usa el mapeo manual de columnas; se recordará para la próxima vez.
* **El precio medio no coincide exactamente con MyInvestor.** Comprueba que el histórico exportado está completo (desde la primera aportación) y recuerda la diferencia entre coste operativo y coste fiscal en fondos con traspasos.
* **Un fondo aparece sin ticker.** Si el ISIN no se resuelve automáticamente, puedes buscarlo y asignarlo a mano desde la propia vista previa.

---

## 7. Después de importar: a rebalancear

Con tus posiciones y tu precio medio cargados, viene lo útil: define el peso objetivo de cada fondo, y cada vez que aportes ahorro nuevo CoreBalance te dirá **cuántos euros meter en cada fondo** para que la cartera vuelva sola a su sitio, sin vender nada. Si aún no tienes clara la mecánica, aquí tienes la guía completa de [cómo rebalancear una cartera indexada](/blog/como-rebalancear-cartera-indexada).

Importar el histórico se hace una vez; la disciplina de aportar y rebalancear es la que hace el resto durante las próximas décadas.
