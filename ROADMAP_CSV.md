# Roadmap: Rediseño del Sistema de Importación CSV

Para solucionar los errores reportados y garantizar que cualquier CSV pueda ser importado, vamos a evolucionar el importador actual hacia un asistente (Wizard) interactivo y resiliente.

## 🎯 Objetivos
- **100% de éxito:** Si el sistema no reconoce el bróker, el usuario puede mapear las columnas manualmente.
- **Transparencia:** El usuario ve exactamente qué se va a importar antes de confirmar.
- **Resolución manual:** Si Yahoo Finance no encuentra un ISIN, el usuario puede introducir el ticker manualmente en el asistente.

---

## 🏗️ Fases de Implementación

### Fase 1: Motor de Mapeo Dinámico (`lib/importers`)
1.  **Refactor de `csv-utils.ts`:**
    *   [x] Detección inteligente de delimitadores (`,`, `;`, `\t`).
    *   [x] Normalización automática de números (manejo de `,` y `.` como separadores decimales inteligente).
2.  **Nuevo Parser Flexible:**
    *   [x] Crear un `mappingParser` que acepte una configuración de columnas (ej: `{ isin: 0, shares: 2, price: 5 }`).

### Fase 2: Rediseño de la Interfaz (`ImportModal.svelte`)
Evolucionar a un asistente de 4 pasos estrictos:

1.  **Paso 1: Selección de Archivo**
    *   [x] Guía visual de "¿Qué CSV necesito?".
    *   [x] Eliminación de auto-detección para evitar errores de confianza.

2.  **Paso 2: Mapeo de Columnas**
    *   [x] Vista previa de las primeras filas del CSV.
    *   [x] Auto-mapeo inteligente de cabeceras comunes.

3.  **Paso 3: Validación y Resolución de Símbolos**
    *   [x] Tabla interactiva con estado de búsqueda.
    *   [x] **Edición Manual de Tickers:** Permitir al usuario corregir o añadir el ticker de Yahoo si no se encuentra por ISIN.

4.  **Paso 4: Confirmación Final**
    *   [x] Resumen de activos a añadir/actualizar.

---

## 🛠️ Tareas Técnicas Inmediatas

- [x] Modificar `ImportResult` para incluir los datos crudos del CSV (primeras filas) para la previsualización.
- [x] Implementar componente `ColumnMapper.svelte` para el Paso 2.
- [x] Actualizar `ImportModal.svelte` con la nueva máquina de estados de pasos.
- [x] Implementar edición manual de tickers en la previsualización.
- [ ] Opcional: Persistencia de mapeos en `localStorage`.
