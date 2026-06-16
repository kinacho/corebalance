---
title: "Rebalanceo en DeGiro con ETFs: cómo hacerlo bien"
description: "Guía práctica para rebalancear tu cartera de ETFs en DeGiro. Estrategias eficientes para minimizar comisiones y el impacto de los impuestos."
publishDate: "2026-06-16"
updatedDate: "2026-06-16"
author: "kinacho"
tags: [rebalanceo, degiro, etfs, comisiones, impuestos]
lang: es
canonical: "https://corebalance.app/blog/rebalanceo-degiro-etfs"
ogImage: "/blog/og/rebalanceo-degiro-etfs.jpg"
slugs: { es: 'rebalanceo-degiro-etfs', en: 'degiro-etf-rebalancing' }
---

DeGiro es uno de los brókers online más populares de Europa debido a sus **bajas comisiones** y a su plataforma intuitiva. Muchos inversores particulares eligen DeGiro para construir sus carteras pasivas a largo plazo utilizando **ETFs (fondos cotizados)** en lugar de fondos indexados tradicionales, atraídos por la liquidez inmediata y la oferta de grandes gestoras mundiales.

Sin embargo, gestionar una cartera de ETFs en España e incurrir en rebalanceos periódicos presenta desafíos muy distintos a los de los fondos indexados. En esta guía exploraremos cómo **rebalancear tu cartera de ETFs en DeGiro de la forma más eficiente**, controlando al máximo las comisiones de compraventa y los impuestos.

---

## 1. El gran desafío de los ETFs en España: La fricción fiscal

Si resides fiscalmente en España, la diferencia más crucial entre un fondo indexado y un ETF es su **tratamiento fiscal al traspasar**:
* **Fondos indexados:** Permiten realizar traspasos exentos de tributación (puedes mover capital de un fondo a otro sin pagar impuestos por las plusvalías).
* **ETFs:** **No disfrutan de esta exención.** Cada vez que quieras mover dinero de un ETF a otro, debes vender el primero (lo cual obliga a declarar las ganancias patrimoniales y pagar a Hacienda entre un 19% y un 28% de impuestos) y comprar el segundo con el saldo restante.

A este peaje fiscal debemos sumarle la **fricción de las comisiones del bróker**: DeGiro cobra una comisión por cada transacción de compra y de venta (salvo en su selección de ETFs seleccionados bajo ciertas condiciones).

Por lo tanto, la estrategia clásica de "vender lo que ha subido para comprar lo que ha bajado" es **sumamente ineficiente** para un inversor de ETFs en DeGiro.

---

## 2. La regla de oro: Rebalanceo por aportación (Cash-Flow)

Para evitar pagar impuestos y comisiones innecesarias, la estrategia inteligente consiste en **rebalancear exclusivamente mediante nuevas aportaciones de capital**.

En lugar de vender el ETF sobreponderado, mantienes tu posición intacta y dedicas tus ahorros mensuales a comprar únicamente participaciones del ETF que se ha quedado rezagado.

### Ejemplo Práctico:
Imagina una cartera con dos ETFs en DeGiro con un objetivo de **70% Acciones / 30% Renta Fija**:
* **ETF 1 (Vanguard FTSE All-World):** Vale actualmente 7.500 € (75% de la cartera).
* **ETF 2 (iShares Global Government Bond):** Vale actualmente 2.500 € (25% de la cartera).
* **Valor total:** 10.000 € (Desviación del 5%).

Si decides aportar **600 €** este mes:
1. **Nuevo valor proyectado:** 10.000 € + 600 € = 10.600 €.
2. **Distribución ideal:**
   * Acciones (70%): 10.600 € x 0,70 = 7.420 €.
   * Bonos (30%): 10.600 € x 0,30 = 3.180 €.
3. **Cálculo de compras:**
   * En acciones ya tienes 7.500 € (supera el ideal). Aportas **0 €**.
   * En bonos tienes 2.500 € y tu ideal es 3.180 €. Aportas la totalidad de los **600 €** a este ETF.

Con este movimiento, has reducido la desviación de tu cartera del 5% a solo un **1.3%** sin vender nada, sin pagar impuestos a Hacienda y pagando comisión por una sola operación en DeGiro en lugar de dos.

---

## 3. Estrategias avanzadas para inversores de ETFs en DeGiro

Si tu cartera es muy grande y tus aportaciones mensuales no son suficientes para corregir las desviaciones, aplica estas tres reglas de optimización:

### A. Amplía tus bandas de tolerancia
En lugar de rebalancear cuando un activo se desvíe un 5%, amplía el límite al **10% absoluto** para carteras de ETFs. Dado que vender implica pagar impuestos, es preferible tolerar un desvío de riesgo ligeramente mayor antes de asumir el peaje fiscal de una venta forzosa.

### B. Aprovecha la selección de ETFs de DeGiro (Selección Core)
DeGiro cuenta con una lista de **ETFs con condiciones de comisión de transacción reducida** (sujeta a política de uso aceptable). Si tu cartera está compuesta por ETFs de esta lista (como el clásico *Vanguard FTSE All-World* o el *iShares Core MSCI World*), realizar compras mensuales para rebalancear no te costará comisiones de corretaje. Asegúrate de leer las condiciones de la promoción de DeGiro para evitar sorpresas.

### C. El problema de las participaciones enteras (Redondeo)
A diferencia de los fondos indexados, que permiten comprar fracciones de participaciones (puedes invertir exactamente 123.45 € en un fondo Vanguard), **los ETFs cotizan como acciones y solo se pueden comprar en unidades enteras**.
Si una participación del ETF de bonos cotiza a 150 € y CoreBalance te indica que debes aportar 200 €, solo podrás comprar 1 participación (150 €) y te quedarán 50 € en efectivo (efectivo sobrante).

---

## 4. Flujo de trabajo paso a paso con CoreBalance y DeGiro

Optimiza tu rutina mensual de inversión de la siguiente manera:

1. **Obtén tus saldos en DeGiro:**
   Entra en tu plataforma de DeGiro y anota el número de participaciones y el valor actual de cada uno de tus ETFs.
2. **Carga los datos en CoreBalance:**
   Introduce tus ETFs con sus ISINs correspondientes, asigna los porcentajes objetivo y escribe el saldo actual de cada uno.
3. **Calcula con aportaciones:**
   Introduce el dinero que vas a transferir a DeGiro este mes. CoreBalance calculará de forma óptima cuántas participaciones enteras debes comprar de cada ETF para equilibrar la cartera al máximo, minimizando el efectivo sobrante que se queda parado sin rentabilizar.
4. **Ejecuta las órdenes en DeGiro:**
   Realiza las compras limitadas en DeGiro según las cantidades indicadas por CoreBalance.

> [!TIP]
> Dado que los ETFs se compran en unidades enteras, es completamente normal que tu cartera nunca esté balanceada al 100.00% exacto. Una desviación residual de +/- 1-2% es perfectamente aceptable y no afecta en absoluto a tu perfil de riesgo a largo plazo. No dejes dinero parado intentando cuadrar decimales inalcanzables.
