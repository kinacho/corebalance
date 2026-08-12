---
titulo: "Tus bandas: el número que decide cuándo actuar"
descripcion: "Qué banda de tolerancia usar, por qué la banda absoluta no es la relativa, y qué dicen dieciséis años de datos reales sobre rebalancear o dejarlo correr."
orden: 6
gancho: "Con datos reales de 2010 a 2026, rebalancear salió 3.474 € peor. Y aun así deberías hacerlo. Aquí está el porqué, con las cifras delante."
minutos: 10
arquetipo: calcular
datos:
  - backtest.diferencia
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
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
  import { BACKTEST, eur, pct } from '$lib/cursos-datos';
</script>

Ya tienes el reparto. ¿Cuánto se puede desviar antes de que hagas algo?

Sin ese número, «tengo una 80/20» solo significa que empezaste con un 80/20. Y antes de elegirlo, el dato que incomoda: esto es lo que pasó de verdad entre 2010 y 2026 con 10.000 € y sin aportaciones.

<Cifras fuente={BACKTEST.procedencia.fuente} fecha={BACKTEST.procedencia.fecha}>
	<Cifra
		valor={eur(BACKTEST.sinRebalancear.valorFinal)}
		unidad=" €"
		etiqueta="Sin rebalancear nunca"
		matiz={`Acabó con el ${pct(BACKTEST.sinRebalancear.pesoRVFinal)} % en bolsa.`}
	/>
	<Cifra
		valor={eur(BACKTEST.rebalanceado.valorFinal)}
		unidad=" €"
		etiqueta="Rebalanceando una vez al año"
		matiz={`Acabó con el ${pct(BACKTEST.rebalanceado.pesoRVFinal)} %, que es lo que había elegido.`}
	/>
</Cifras>

Lo primero que hay que decir es lo que va contra el discurso habitual: **no rebalancear terminó con más dinero**. No es casualidad ni error — son dieciséis años excepcionalmente buenos para la bolsa, y dejar correr la parte de acciones paga cuando las acciones casi no dejan de subir. Si alguien te dice que rebalancear mejora la rentabilidad, pídele los datos.

<Comprueba
	pregunta="Quien no rebalanceó acabó con más dinero. ¿Qué acabó teniendo, además del dinero?"
	opciones={[
		{
			texto: 'La misma cartera, solo que más grande',
			correcta: false,
			porque: 'Es lo que parece si solo se mira la última fila. Pero el objetivo era un 80 % en bolsa y terminó muy por encima: la proporción se movió sola durante dieciséis años.'
		},
		{
			texto: 'Otra cartera, con un riesgo que nunca decidió',
			correcta: true,
			porque: 'Ahí está todo. La ventaja se construyó asumiendo un riesgo que nadie eligió: si el año siguiente hubiera sido 2008, esa cartera habría caído como lo que era, no como lo que su dueño creía tener.'
		},
		{
			texto: 'Menos comisiones, al no haber operado',
			correcta: false,
			porque: 'Cierto y menor: el backtest no incluye comisiones ni impuestos, así que con costes reales rebalancear sale algo peor todavía en rentabilidad. Sigue sin ser el motivo por el que se rebalancea.'
		}
	]}
/>

## Rebalancear no es una técnica de rentabilidad

**Es lo que mantiene la cartera siendo la que elegiste.** Por eso la pregunta correcta no es «¿cuánto me hace ganar?» sino «¿cuánto llevo siendo otra cosa?». Y la respuesta a esa pregunta es tu banda.

## La banda es absoluta, no relativa

Una banda de 5 puntos porcentuales sobre un objetivo del 10 % tolera entre el 5 % y el 15 %, no entre el 9,5 % y el 10,5 %. No es un detalle: con bandas relativas una posición pequeña se sale constantemente y te obliga a operar por movimientos que no cambian nada.

<Mando
	etiqueta="Tu banda, en puntos porcentuales"
	min={1}
	max={10}
	paso={1}
	inicial={5}
	unidad=" pp"
	etiquetaResultado="Sobre un objetivo del 10 %, toleras"
	calcular={(pp) => `del ${(10 - pp).toLocaleString('es-ES')} % al ${(10 + pp).toLocaleString('es-ES')} %`}
	nota="Más estrecho te hace operar mucho; más ancho deja que la cartera se convierta en otra. Cinco puntos es un punto de partida razonable."
/>

## ¿Bandas o calendario?

**Por calendario** revisas cada X meses: simple y automatizable, aunque a veces operas sin necesidad. **Por bandas** revisas cuando algo se sale: operas menos, pero exige mirar. Casi todo el mundo que lleva años hace las dos juntas.

<div class="bloque aviso">

## Lo que no te van a contar

**El backtest de arriba no incluye comisiones ni impuestos**, y está escrito en sus supuestos. En España, si son fondos, el traspaso elimina la parte fiscal, que es la más cara: ese es el argumento de verdad a favor de rebalancear aquí, y es local.

**Dieciséis años es una ventana, no la verdad.** En un periodo con una caída fuerte al final el resultado se invierte. Cualquiera que te presente un backtest como prueba definitiva está eligiendo las fechas.

**Y rebalancear con aportaciones no tiene ninguno de estos costes.** Si compras lo que falta con dinero nuevo, no hay comisión de venta ni impuesto. Es la vía por defecto mientras estés aportando.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La banda es absoluta: 5 pp sobre un 10 % es de 5 a 15.
- Con datos reales 2010-2026, no rebalancear rindió más.
- Pero acabó con otra cartera: mucho más en bolsa de lo que había elegido.
- Rebalancear mantiene el riesgo que elegiste. No es una técnica de rentabilidad.
- Mientras aportes, rebalancea comprando lo que falta.

</div>
