---
titulo: "Tus bandas: el número que decide cuándo actuar"
descripcion: "Qué banda de tolerancia usar, por qué la banda absoluta no es la relativa, y qué dicen dieciséis años de datos reales sobre rebalancear o dejarlo correr."
orden: 6
gancho: "Con datos reales de 2010 a 2026, rebalancear salió 3.474 € peor. Y aun así deberías hacerlo. Aquí está el porqué, con las cifras delante."
minutos: 10
accion:
  texto: "Responde las cuatro preguntas del checklist y contrástalo con la banda que acabas de elegir. Si no coinciden, una de las dos cosas está mal pensada."
  cta: "Contrastar con el checklist"
  href: "/herramientas/checklist-rebalanceo"
lecturas:
  - texto: "Qué pasa si no rebalanceo nunca mi cartera (el backtest completo)"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
  - texto: "Cuándo rebalancear la cartera"
    href: "/blog/cuando-rebalancear-cartera"
  - texto: "Cómo rebalancear una cartera indexada"
    href: "/blog/como-rebalancear-cartera-indexada"
---

<script>
  import BacktestTable from '$lib/components/blog/BacktestTable.svelte';
</script>

Ya tienes el reparto. Falta la otra mitad de la decisión, que casi nadie escribe: **cuánto se puede desviar antes de que hagas algo.**

Sin ese número, «tengo una 80/20» no significa nada. Significa que empezaste con un 80/20.

## Banda absoluta, no relativa

Una banda de 5 puntos porcentuales sobre un objetivo del 10 % tolera entre el **5 % y el 15 %**. No entre el 9,5 % y el 10,5 %.

Parece un detalle y no lo es: con bandas relativas, una posición pequeña se sale constantemente y te obliga a operar por movimientos que no cambian nada. La banda absoluta trata igual una desviación de 5 puntos venga de donde venga, que es lo que quieres, porque lo que te preocupa es el riesgo de la cartera, no el porcentaje de una línea.

Cinco puntos es un punto de partida razonable. Más estrecho te hace operar mucho; más ancho deja que la cartera se convierta en otra.

## Y ahora los datos, incluido el que incomoda

Esto no es una simulación con supuestos: son series reales de mercado, cierres mensuales con dividendos reinvertidos, de enero de 2010 a julio de 2026. Una cartera 80/20 con 10.000 € iniciales, sin aportaciones, comparando no rebalancear nunca contra rebalancear una vez al año.

<BacktestTable lang="es" />

Lo primero que hay que decir es lo que va contra el discurso habitual: **no rebalancear terminó con 3.474 € más.** Y no es casualidad ni error: son dieciséis años excepcionalmente buenos para la bolsa, y dejar correr la parte de acciones paga cuando las acciones casi no dejan de subir.

Si alguien te dice que rebalancear mejora la rentabilidad, pídele los datos.

## Entonces por qué rebalancear

Mira la última columna, que es la que nadie enseña.

Quien no rebalanceó **acabó con un 93,6 % en acciones** sobre un objetivo del 80. No terminó con más dinero en su cartera: terminó con más dinero en **otra** cartera. Una que él no eligió, con un perfil de riesgo que fue derivando solo durante dieciséis años.

Y ahí está el punto: si el siguiente año hubiera sido 2008, ese 93,6 % habría caído como un 93,6 %, no como un 80. La ventaja de 3.474 € se construyó asumiendo un riesgo que no había decidido.

Rebalancear no es una técnica para ganar más. **Es lo que mantiene la cartera siendo la que elegiste.** Por eso la pregunta correcta no es «¿cuánto me hace ganar?» sino «¿cuánto llevo siendo otra cosa?».

## Bandas o calendario

**Por calendario**: revisas cada X meses y ajustas. Simple, automatizable, y a veces operas sin necesidad.

**Por bandas**: revisas cuando algo se sale. Operas menos y solo cuando importa, pero exige mirar.

**Las dos juntas** es lo que hace casi todo el mundo que lleva años: revisión trimestral o semestral, y solo se toca lo que se ha salido de banda. Es lo que la herramienta enseña de un vistazo, y también el histórico de cuánto tiempo llevas fuera — que es la pregunta de esta lección aplicada al pasado.

<div class="bloque aviso">

## Lo que no te van a contar

**El backtest de arriba no incluye comisiones ni impuestos.** Está escrito en sus supuestos. Con costes reales, rebalancear sale algo peor todavía en rentabilidad — y en España, si son fondos, el traspaso elimina la parte fiscal, que es la más cara. Ese es el argumento de verdad a favor de rebalancear aquí, y es local.

**Dieciséis años es una ventana, no la verdad.** En un periodo con una caída fuerte al final, el resultado se invierte: rebalancear habría reducido el golpe. Cualquiera que te presente un backtest como prueba definitiva está eligiendo las fechas.

**Y rebalancear con aportaciones no tiene ninguno de estos costes.** Si en vez de vender lo que sobra compras lo que falta con dinero nuevo, no hay comisión de venta ni impuesto. Es la vía por defecto mientras estés aportando, y es lo que calcula la app.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La banda es absoluta: 5 pp sobre un 10 % es de 5 a 15.
- Con datos reales 2010-2026, no rebalancear rindió más — 3.474 € más.
- Pero acabó con un 93,6 % en acciones sobre un objetivo del 80: otra cartera.
- Rebalancear mantiene el riesgo que elegiste. No es una técnica de rentabilidad.
- Mientras aportes, rebalancea comprando lo que falta.

</div>

