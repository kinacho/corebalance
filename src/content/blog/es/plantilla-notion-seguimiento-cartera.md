---
title: "Plantilla de Notion y Markdown para seguimiento de cartera gratis"
description: "Consigue una plantilla gratuita en Notion o Markdown para el seguimiento manual de tus inversiones y fondos indexados de forma privada."
summary:
  - "Un registro sano de cartera necesita tres áreas: la asignación de activos objetivo, el inventario actual de fondos y el historial de aportaciones y rebalanceos."
  - "El artículo incluye una plantilla en Markdown lista para copiar y las propiedades concretas para montar la misma estructura como base de datos en Notion."
  - "Mantener el registro en Markdown local da privacidad absoluta, a cambio de actualizar los saldos a mano una vez al mes."
publishDate: "2026-07-24"
updatedDate: "2026-07-24"
author: "kinacho"
tags: [recursos, notion, markdown, plantilla, seguimiento-cartera]
lang: es
canonical: "https://corebalance.app/blog/plantilla-notion-seguimiento-cartera"
ogImage: "/blog/og/plantilla-notion-seguimiento-cartera.jpg"
slugs: { es: 'plantilla-notion-seguimiento-cartera', en: 'notion-portfolio-tracker-template' }
---

Llevar un diario financiero o un registro estructurado de tus inversiones es uno de los mejores hábitos que puedes adquirir. Te ayuda a mantener los pies en el suelo en momentos de volatilidad del mercado, te recuerda tus objetivos a largo plazo y mantiene organizados tus costes de adquisición.

Aunque las hojas de cálculo como [Excel](/comparativas/corebalance-vs-excel) o Google Sheets son muy comunes, muchos inversores prefieren la limpieza visual y el orden de herramientas de notas como **Notion** o archivos de texto plano en **Markdown** (ideales para integrarse con herramientas como Obsidian o Logseq).

En este artículo te ofrecemos una **plantilla gratuita de seguimiento de cartera en Notion y Markdown** lista para copiar y usar, te explicamos cómo estructurarla de forma sencilla y te damos consejos para integrarla en tu rutina mensual.

---

## 1. Estructura recomendada para el seguimiento de cartera

Tanto si usas Notion como si trabajas en Markdown, un registro saludable de tu cartera debe constar de tres áreas principales:

1. **La Asignación Estratégica ([Asset Allocation](/blog/que-es-asset-allocation)):** Tus porcentajes objetivo (ej. 80% acciones, 20% bonos).
2. **El Inventario de Activos:** La lista de fondos o ETFs que posees, su ISIN, la comercializadora donde los custodias y su coste medio de adquisición.
3. **El Historial de Aportaciones / Rebalanceos:** Un registro cronológico de cuánto capital aportas cada mes y en qué fecha realizas ajustes.

---

## 2. Plantilla de Markdown Copy-Pasteable

A continuación tienes una plantilla limpia en formato Markdown. Puedes copiar el siguiente bloque de texto y pegarlo directamente en tu editor de notas favorito (como Obsidian, Logseq, Typora o VS Code):

```markdown
# 📈 Diario de Inversión y Seguimiento de Cartera

*Última actualización: 2026-06-16*

---

## 🎯 Asignación de Activos Objetivo

| Clase de Activo | Fondo / ETF | Peso Objetivo (%) |
|---|---|---|
| Renta Variable Desarrollada | Vanguard Global Stock Index (IE00B03HD191) | 80% |
| Renta Variable Emergente | Vanguard Emerging Markets Stock (IE0031786142) | 20% |
| Renta Fija Global | Vanguard Global Bond Index (IE00B18GC888) | 0% |

**Total Renta Variable:** 100%  
**Total Renta Fija:** 0%

---

## 💼 Inventario Actual de Fondos

| Activo | Custodio | Participaciones | Coste Medio (€) | Saldo Actual (€) |
|---|---|---|---|---|
| Vanguard Global Stock | MyInvestor | 124.512 | 80.32 € | 10.000 € |
| Vanguard Emerging Markets | MyInvestor | 32.145 | 62.21 € | 2.000 € |

*Nota: Los saldos actuales se actualizan manualmente una vez al mes consultando la app del banco.*

---

## 📝 Historial de Operaciones y Aportaciones

- **2026-06-16:** Nueva aportación de **500 €**.
  - 400 € destinados a *Vanguard Global Stock*.
  - 100 € destinados a *Vanguard Emerging Markets*.
  - *Resultado:* Cartera balanceada perfectamente al 80/20.
- **2026-05-15:** Aportación mensual de **500 €** distribuida de forma proporcional.
```

---

## 3. Plantilla en Notion: Cómo construir tu base de datos

Si prefieres la base de datos visual de Notion, te recomendamos crearla con las siguientes propiedades:

1. **Crea una base de datos principal llamada "Cartera":**
   - **Columna 1 (Name):** Nombre del Fondo o ETF.
   - **Columna 2 (Select):** Tipo de activo (Renta Variable / Renta Fija / Oro).
   - **Columna 3 (Number):** Porcentaje Objetivo (%).
   - **Columna 4 (Number):** Saldo Actual (€).
   - **Columna 5 (Formula):** Porcentaje Real (fórmula: `prop("Saldo Actual") / sum(prop("Saldo Actual"))`).
2. **Crea una segunda base de datos llamada "Historial de Aportaciones":**
   - Relaciónala con la base de datos principal para asociar cada aportación de dinero al fondo correspondiente.
   - Añade una columna de fecha para realizar el seguimiento del flujo de caja anual.

---

## 4. La filosofía "Local-First" aplicada al registro

Mantener tus notas financieras en archivos de Markdown locales en tu disco duro tiene un enorme beneficio: **la privacidad absoluta**.

Ninguna multinacional tecnológica tiene acceso a tu patrimonio neto, ni tus datos financieros viajan por internet expuestos a posibles filtraciones de seguridad. Eres el dueño absoluto de tu información financiera, lo cual encaja perfectamente con la filosofía de inversión pasiva independiente y prudente de John Bogle.

---

## CoreBalance: El puente perfecto entre automatización y privacidad

Si te gusta la privacidad del Markdown local pero te cansa calcular manualmente las diferencias de decimales y porcentajes al final de cada mes para saber qué fondo comprar, **CoreBalance** es tu aliado ideal.

Nuestra calculadora web gratuita no requiere registro ni sube tus datos a internet. Toda la información de tu cartera se almacena de forma encriptada en el almacenamiento local de tu navegador web (`localStorage`). CoreBalance realiza todos los cálculos por ti al instante, indicándote la distribución exacta de tu aportación mensual en segundos para que luego solo tengas que registrar el apunte limpio en tu diario de Markdown.
