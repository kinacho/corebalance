# Plan de Ruta (Roadmap) y Desglose de Proyectos

A partir de tu feedback detallado, hemos dividido las peticiones en **proyectos independientes y modulares**. De este modo, podemos acometer los cambios de forma progresiva sin alterar la estabilidad de la aplicación y evaluando la prioridad de cada uno.

Además, hemos analizado el estado actual del código: **varias de las peticiones ya están totalmente completas y operativas** en esta versión.

---

## 🟢 1. Características ya completadas en el código actual

Antes de lanzar nuevos proyectos, confirmamos el estado de estas funcionalidades:

*   **Arrastrar y Soltar Vehículos (Drag & Drop en Categorías):**
    *   *Estado:* **¡100% Completado!** 
    *   *Detalles:* Hemos implementado un sistema nativo HTML5 para escritorio y un **sistema táctil virtual ultra-fluido para móviles** (con efecto fantasma flotante, respuesta háptica y auto-scroll vertical inteligente en los bordes). Permite mover activos entre "Cartera principal", "Cartera conservadora" y "Acciones" arrastrándolos de forma cómoda por toda la zona izquierda de la tarjeta.
*   **Identificación del Nombre Real del Activo:**
    *   *Estado:* **¡100% Completado!** 
    *   *Detalles:* Los buscadores y el importador de CSV ya resuelven los tickers mediante los endpoints `/api/search` y `/api/resolve` conectados a Yahoo Finance. Resuelven el nombre real completo (ej: *"iShares EmergMkts Idx (IE) S Acc EUR"*) en vez de dejar el ticker en bruto (ej: `0P0001XF3Z.F`) al darlos de alta.
*   **Proyecto A: Autonomía Local y Reorganización de Configuración:**
    *   *Estado:* **¡100% Completado!**
    *   *Detalles:* Se habilitó la exportación del `portfolio.json` en local para cualquier usuario, se implementó el modo privacidad que oculta completamente los valores y ejes de las gráficas (`****`), y se rediseñó el menú de ajustes dividiendo la "Configuración de Cartera" de la "Configuración de App" (con su nuevo menú desplegable).

---

## 🎛️ Proyecto B: Motor de Sliders Autocompensados 100% (UX Medio)
En lugar de alertar cuando la suma no es 100%, los sliders se ajustarán entre sí dinámicamente.

### Tareas:
1.  **Algoritmo de Compensación Ponderada:**
    *   Al mover un slider de un activo hacia arriba o abajo, los pesos del resto de activos de esa categoría se reducen o incrementan de forma proporcional a su peso actual, manteniendo siempre la **suma total bloqueada estrictamente al 100%**.
2.  **Bloqueo de Sliders Específicos:**
    *   Permitir poner un candado (`lock`) a un activo para que su peso se mantenga fijo mientras arrastras los demás.
3.  **Soporte de Decimales en Porcentajes de Asignación:**
    *   Permitir la introducción de porcentajes con decimales (ej. 7,5%) en la configuración de la cartera principal, en lugar de estar limitados únicamente a números enteros.

---

## 📈 Proyecto C: Registro y Libro de Transacciones (Ledger Histórico) (Complejo)
Dejar de usar una sola cifra plana de participaciones y pasar a un registro contable de aportaciones con marca de tiempo.

### Tareas:
1.  **Base de Datos de Transacciones (Transacciones individuales):**
    *   Crear una estructura de datos `Transaction` (`timestamp`, `ticker`, `shares`, `price`, `commission`). Permitir registrar las participaciones que se vayan comprando mes a mes junto a su precio de compra real (estilo Investing Pro), en lugar de sobrescribir el total de participaciones manualmente.
2.  **Cálculo Automático de Precio Medio Ponderado:**
    *   Calcular de forma nativa e interna el precio medio ponderado de coste (`avgCost`) e histórico acumulado a partir de esta lista de transacciones.
3.  **Línea Temporal Interactiva en Gráficos:**
    *   Permitir arrastrar y hacer zoom en el gráfico de "Evolución de Patrimonio" para detallar aportaciones en intervalos de tiempo concretos.

---

## 🧭 Proyecto D: Claridad del Simulador de Crisis, Rebalanceo y Proyecciones (UX Contenido)
Mejorar la experiencia educativa y la parametrización de las herramientas de proyección.

### Tareas:
1.  **Rework del Simulador de Crisis:**
    *   Añadir una pequeña tarjeta explicativa de uso: aclarar que simula el impacto instantáneo (drawdown) en el patrimonio actual según caídas históricas reales (DotCom, 2008 Lehman, COVID) y cuánto tiempo tardó en recuperarse históricamente.
2.  **Saldo Inicial Personalizable en "Proyección de Futuro":**
    *   Añadir un desplegable "Base" (similar al de aportación u horizonte) que permita elegir si la estimación se calcula sobre el total real actual de la cartera o si se hace un ejercicio específico introduciendo un importe inicial de base con el que comenzar.
3.  **Visualizadores de Rebalanceo:**
    *   Añadir ayuda visual interactiva para comprender cómo la herramienta calcula la inyección óptima de capital necesaria para restaurar los pesos ideales.
