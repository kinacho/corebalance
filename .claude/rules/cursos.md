---
paths:
  - "src/content/cursos/**"
  - "src/routes/cursos/**"
  - "src/lib/cursos.ts"
  - "src/lib/cursos-datos.ts"
  - "src/lib/components/cursos/**"
---

# Los cursos: formato de lección y kit didáctico

### Por qué el formato es un contrato y no un estilo

Las 34 lecciones nacieron con un único esqueleto —entrada, tres o cinco `h2` de prosa, `bloque aviso`, `bloque retener`— y sin una sola excepción. Medido sobre el corpus entero antes de rehacerlo: **0 imágenes, 0 diagramas, 0 blockquotes, 4 tablas y 3 calculadoras**, ningún `h3`, y el modo retórico enteramente declarativo: cero preguntas, cero predicciones pedidas, cero momentos en los que el lector se comprometa con una respuesta antes de que se la den. La prosa era buena; lo que fallaba era la arquitectura del turno de habla.

⚠️ **El defecto que esto arregla no produce ningún error.** Una lección que vuelve a ser un muro de texto compila igual, pasa `svelte-check` igual, se prerenderiza igual y se ve perfectamente: solo es peor de leer. Por eso el formato vive en un test (`src/content/cursos/lecciones.test.ts`) y no en una convención — la única barrera contra la regresión sería que alguien se acordase, y son 34 ficheros escritos a lo largo de meses.

### El guion de lección

El orden es fijo; los tiempos, no todos obligatorios. Pregunta que la lección responde → el dato que no cuadra, con un objeto visual en la primera pantalla → la intuición ajena → la comprobación → el mecanismo en prosa → el ejemplo trabajado → el borde (`bloque aviso`) → el resumen (`bloque retener`).

`arquetipo` en el frontmatter declara qué clase de lección es (`desmontar`, `procedimiento`, `dato`, `decidir`, `calcular`) y **desplaza dónde cae la comprobación**: antes de la explicación cuando se desmonta una intuición, después del procedimiento cuando se recorre uno. Es lo que impide que las 34 se lean igual compartiendo el mismo kit, y por eso el test exige que dos lecciones consecutivas de un curso no lo repitan.

### Las diez reglas, y por qué R3 es la que se olvida

`lecciones.test.ts` falla por lección y con su nombre. R2 pone el techo —ninguna tirada de prosa seguida pasa de 150 palabras sin nada que mirar— y ⚠️ **R3 pone el suelo: al menos un tramo continuo de 100 palabras**. Sin R3 el rediseño degenera en diapositivas: trocear un argumento en tarjetas deja al lector con hechos sueltos y sin la deducción que los une. La regla de contención que R3 codifica: un objeto visual puede ilustrar una premisa o enseñar la conclusión, **nunca sentarse en medio de un «luego»**; los conectores viven en la prosa.

⚠️ **`PENDIENTES` es un andamio y tiene que quedar vacío**, mismo patrón que `MENCIONES_HISTORICAS` en `doc-drift.mjs`. Mientras una lección esté ahí, ninguna regla se le aplica.

⚠️ **La banda de palabras (650-1.050) son valores medidos, no elegidos**, y es más alta que la del formato viejo por una razón que conviene no perder: el porqué de cada opción de una comprobación es contenido nuevo, unas 150 palabras por lección que antes no existían en ninguna parte. La prosa corrida —lo que hacía el muro— bajó de 450-700 a 371-608 en las mismas lecciones.

⚠️ **El medidor cuenta las dos clases de comillas.** Un atributo se escribe `pregunta="…"` y el texto que viaja dentro de un objeto JS se escribe `porque: '…'`; contando solo las dobles, la mitad de lo que enseña una comprobación no existía para el contador y una lección llena de contenido salía como si estuviera vacía.

### El kit

Cinco piezas en `src/lib/components/cursos/`, y la lista es corta a propósito: es mejor que cinco se usen treinta veces a que doce se usen tres.

- **`Cifras` / `Cifra`** — saca el número del párrafo. `fuente` y `fecha` son props **requeridas en TypeScript**: un dato dibujado parece más autoritativo que el mismo dato en prosa, así que sin procedencia es un pasivo mayor que dejarlo escrito. El compilador hace de auditor y no hace falta disciplina.
- **`Barras`** — comparación de magnitudes. ⚠️ **Es HTML y CSS, no SVG**, y es una decisión medida: un `<text>` de SVG ni se ajusta ni se recorta solo, que es por lo que el treemap arrastra `approximateTextWidth` y un `clipPath` por celda. Con etiquetas en prosa española habría que resolver otra vez ese problema entero.
- **`Comprueba`** — una por lección, antes del 70 % del cuerpo. Ver abajo.
- **`Pasos`** — el ejemplo trabajado y el procedimiento; `aviso` marca el paso que la gente se salta, que es lo más valioso de la pieza.
- **`Mando`** — un control, un número. ⚠️ **Arranca con un valor por defecto realista y la lección se entiende sin tocarlo**: quien no ha contratado nada no conoce su TER, y un widget que exige un dato que el lector no tiene solo enseña que no está preparado.

⚠️ **`CalculadoraAccDist` y `CalculadoraRecompra` no se absorbieron bajo `Mando`.** Las comparten las páginas de `/herramientas`, y la regla del proyecto es que esa aritmética fiscal no existe en dos copias; refactorizarlas metería riesgo de dinero en un cambio de formato.

### Tres cosas de `Comprueba` que no son opcionales

- ⚠️ **Los `porque` van en el HTML desde el primer render**, ocultos con CSS y `aria-hidden`, nunca inyectados al responder. Si se inyectaran, unas 150 palabras por lección no existirían ni para Google ni para quien no hidrata. El `<noscript>` cierra la otra mitad: sin JavaScript no hay nada que pulsar, así que se enseñan todas de entrada.
- ⚠️ **Es UNA parada de tabulación**, no una por opción: `role="radiogroup"` con tabindex rotatorio. `e2e/cursos-navegacion.spec.ts` tabula 60 veces desde el principio de la lección y tiene que alcanzar `.accion-cta`; cuatro botones sueltos gastarían cuatro paradas de ese presupuesto. R8 lo vigila estáticamente, sin depender del navegador.
- **La selección no sigue al foco**, al revés que un grupo de radios normal: aquí elegir revela la respuesta, así que pasar por encima con la flecha no puede destriparla. Y solo cuenta la primera respuesta, porque dejar cambiarla convierte la comprobación en «prueba hasta que se ponga verde».

### Los datos no se teclean

`src/lib/cursos-datos.ts` deriva de `backtest-8020.json`, `indices.json` y `SAVINGS_TAX_BRACKETS` las cifras que antes estaban escritas a mano dentro del párrafo. Regenerar el backtest o subir el `asOf` de los índices dejaba la prosa mintiendo **sin que nada se pusiera rojo**. Una lección que cite una cifra literalmente la declara en `datos:` y R7 comprueba que el fichero contiene el valor vigente.

⚠️ **`eur()` fuerza `useGrouping: 'always'`.** El español agrupa a partir de cinco cifras, así que `(3474).toLocaleString('es-ES')` devuelve `3474` y `(45991)` devuelve `45.991`: juntos en la misma tarjeta parecen dos formatos distintos. Lo cazó R7 al no encontrar en la lección el valor que el módulo generaba.

⚠️ **No hay gráfico de líneas del backtest y no puede haberlo**: el JSON tiene los extremos y los agregados, **no la serie de 199 meses**. Dibujar la curva sería inventarla.

### Color

Pasado el validador de la skill `dataviz` contra la superficie `#0d0d12`: los cinco acentos juntos **fallan** como categórica. El par por defecto es `--accent-blue` + `--accent-orange`; el verde solo entra de tercero y **solo con etiqueta directa en cada barra**, que es lo que `Barras` hace siempre. Magnitud ordenada —los tramos del IRPF, los pesos por región— va en rampa de un solo azul, nunca en la categórica.

### SEO y GEO

- **`FAQPage` sale del propio cuerpo.** `remarkFaq` recoge todo encabezado que acabe en `?` con el texto que le sigue; ya se aplicaba a estos markdown y salía siempre vacío porque ningún encabezado preguntaba nada. Las 34 lecciones tienen ahora al menos uno, así que lo marcado es exactamente lo que el lector ve.
- ⚠️ **Un bloque JSON-LD por URL.** `BreadcrumbList`, `FAQPage`, `Course` y `LearningResource` cuelgan del mismo `@graph`. `tus-bandas` servía **dos** bloques porque `BacktestTable` emite su propio `Dataset`; se sustituyó por `Cifras` alimentado de `cursos-datos.ts`, que además quita la cifra escrita a mano. `seo:audit` no caza los bloques duplicados: solo valida que cada uno parsee.
- Los cursos entran en `llms.txt` desde `collectCursos()` en `scripts/generate-llms.mjs`. ⚠️ Lee los títulos de `CURSOS` con una expresión regular y **comprueba que salen tantos como directorios hay**: si cambia la forma de ese array, el `prebuild` falla en vez de emitir un índice incompleto.
- `CURSOS_LASTMOD` en `src/routes/sitemap.xml/+server.ts` se sube **a mano** al cambiar el contenido visible de una lección.
