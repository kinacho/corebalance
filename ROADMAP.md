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

---

## 🛠️ Proyecto A: Autonomía Local y Reorganización de Configuración (Alta Prioridad / Rápido)
Este proyecto se centra en mejorar la privacidad local, el selector visual de valores y clarificar la interfaz de ajustes de la aplicación.

### Tareas:
1.  **Exportación JSON Offline:**
    *   Habilitar la exportación del archivo de configuración `portfolio.json` en local para cualquier usuario, **esté o no logueado con Google**.
2.  **Ocultación Completa de Valores (Modo Privacidad en Ejes):**
    *   Conectar el botón de mostrar/ocultar valores (el ojo en el dashboard) con los gráficos para que **oculte también los números y etiquetas del Eje Y**, logrando una privacidad visual absoluta al enseñar la pantalla.
3.  **Rediseño del Botón de Engranaje (Menú de Ajustes):**
    *   Cambiar la nomenclatura y el icono de los menús. Separar la **Configuración de Cartera** (sliders, activos, ISINs) de la **Configuración de la App** (Idioma, Exportar JSON, etc.).

---

## 🎛️ Proyecto B: Motor de Sliders Autocompensados 100% (UX Medio)
En lugar de alertar cuando la suma no es 100%, los sliders se ajustarán entre sí dinámicamente.

### Tareas:
1.  **Algoritmo de Compensación Ponderada:**
    *   Al mover un slider de un activo hacia arriba o abajo, los pesos del resto de activos de esa categoría se reducen o incrementan de forma proporcional a su peso actual, manteniendo siempre la **suma total bloqueada estrictamente al 100%**.
2.  **Bloqueo de Sliders Específicos:**
    *   Permitir poner un candado (`lock`) a un activo para que su peso se mantenga fijo mientras arrastras los demás.

---

## 📈 Proyecto C: Registro y Libro de Transacciones (Ledger Histórico) (Complejo)
Dejar de usar una sola cifra plana de participaciones y pasar a un registro contable de aportaciones con marca de tiempo.

### Tareas:
1.  **Base de Datos de Transacciones (Transacciones individuales):**
    *   Crear una estructura de datos `Transaction` (`timestamp`, `ticker`, `shares`, `price`, `commission`).
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
    *   Añadir un input numérico de "Saldo Inicial" para que el usuario pueda simular escenarios con capitales de partida diferentes al de su cartera real actual.
3.  **Visualizadores de Rebalanceo:**
    *   Añadir ayuda visual interactiva para comprender cómo la herramienta calcula la inyección óptima de capital necesaria para restaurar los pesos ideales.
