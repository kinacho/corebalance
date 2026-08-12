---
titulo: "Rebalancear aportando, sin vender ni tributar"
descripcion: "La vía sin coste fiscal ni comisiones de venta: repartir la aportación entre lo que va por detrás. Cómo se calcula y cuándo deja de bastar."
orden: 3
gancho: "Mientras estés aportando, casi nunca necesitas vender para rebalancear. Y casi nadie lo hace así."
minutos: 8
arquetipo: procedimiento
accion:
  texto: "Pon cuánto vas a aportar este mes y la app reparte esa cantidad entre tus posiciones en proporción a lo que le falta a cada una. Nunca propone vender: es rebalanceo por flujo de caja."
  cta: "Repartir mi próxima aportación"
  href: "/"
lecturas:
  - texto: "Rebalanceo en MyInvestor sin impuestos"
    href: "/blog/rebalanceo-myinvestor-sin-impuestos"
  - texto: "Rebalancear sin pagar impuestos en España"
    href: "/blog/rebalancear-sin-pagar-impuestos-espana"
  - texto: "Calculadora de rebalanceo en Excel"
    href: "/blog/calculadora-rebalanceo-cartera-excel"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
</script>

¿Y si pudieras rebalancear sin vender nada, sin pagar impuestos y sin salir del mercado ni un día?

<Pasos
	titulo="Rebalanceo por flujo de caja, paso a paso"
	pasos={[
		{
			titulo: 'Calcula cuánto debería valer cada posición',
			detalle: 'Su peso objetivo aplicado al valor total de la cartera. Es el número contra el que se compara todo lo demás.'
		},
		{
			titulo: 'Réstale lo que vale de verdad',
			detalle: 'La diferencia es su déficit. Las posiciones que sobran no entran en el reparto: aquí no se vende nada.'
		},
		{
			titulo: 'Reparte la aportación entre los déficits, en proporción',
			detalle: 'Quien más lejos está de su objetivo, más recibe. Eso es exactamente lo que calcula esta app, y por eso solo compra.',
			aviso: 'Con aportaciones pequeñas y un bróker que cobra por operación, repartir entre cuatro posiciones puede costar un 2 %. Ahí conviene concentrar el mes en una sola e ir rotando.'
		}
	]}
/>

## Por qué casi nadie lo hace así

Porque la aportación mensual va en automático al mismo sitio, con el mismo reparto fijo, desde el día que se configuró. Es cómodo y funciona, pero desaprovecha la palanca: si este mes tu parte de emergentes va por detrás, esa aportación puede corregirlo entera sin que hagas nada más.

## ¿Compensa el trabajo de cambiarlo cada mes?

Depende de cuánto aportas respecto a lo que ya tienes, y no es una cuestión de opinión. Con una cartera pequeña y una aportación grande, cada mes es una oportunidad de corregirlo casi todo y la palanca es enorme; con una cartera de veinte años y la misma aportación, el mismo esfuerzo mueve décimas. Conviene medirlo una vez en lugar de decidirlo por intuición, porque la intuición aquí falla siempre en la misma dirección y es la cara: casi todo el mundo cree que su aportación pesa bastante más de lo que pesa, sobre todo cuando lleva años aportando y recuerda el esfuerzo de cada mes en vez del tamaño del total.

<Mando
	etiqueta="Lo que ya tienes invertido"
	min={5000}
	max={300000}
	paso={5000}
	inicial={40000}
	unidad=" €"
	etiquetaResultado="Lo que corrige una aportación de 500 €"
	calcular={(cartera) => `${((500 / cartera) * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} puntos`}
	nota="Dirigiendo la aportación entera a una sola posición. Es el techo de lo que esta vía puede arreglar en un mes."
/>

<Comprueba
	pregunta="Cartera de 100.000 €, aportación de 300 € al mes, desviación de 8 puntos. ¿Basta con aportar?"
	opciones={[
		{
			texto: 'Sí, solo hay que tener paciencia',
			correcta: false,
			porque: 'La paciencia tiene un límite y aquí se calcula: 8 puntos sobre 100.000 € son 8.000 €, que a 300 € al mes son más de dos años dirigiendo cada euro al mismo sitio. Para entonces los pesos ya se habrán movido otra vez.'
		},
		{
			texto: 'No: la aportación es demasiado pequeña frente a la cartera',
			correcta: true,
			porque: 'Es la regla que hay que llevarse: cuanto mayor es tu cartera respecto a lo que aportas, menos alcanza esta vía. Al principio lo corrige todo; con los años deja de llegar y entran los traspasos.'
		},
		{
			texto: 'Sí, si además dejo de aportar a lo que sobra',
			correcta: false,
			porque: 'Ya está supuesto en el cálculo: los 300 € van enteros al déficit. Aun así no llega, y ese es justo el punto.'
		}
	]}
/>

Por eso el panel de esta app te dice también **cuántos meses tardarías** en volver a banda solo aportando. Es la comparación honesta contra «arreglarlo hoy vendiendo»: a veces esperar cuatro meses es mejor negocio que pagar el impuesto hoy, y a veces la espera son cuatro años y hay que decidir de verdad.

<div class="bloque aviso">

## Lo que no te van a contar

**Aportar a lo que ha caído da miedo.** Es literalmente comprar lo que va peor, y todos los meses parece mala idea. Automatizar el criterio —no la cantidad, el criterio— es lo que lo hace sostenible.

**No siempre es óptimo aportar solo al rezagado.** Si una posición está muy por debajo por un motivo estructural y no por oscilación, llenarla a ciegas es doblar la apuesta. Rebalancear supone que tu reparto sigue siendo válido; si ya no lo es, lo que toca es cambiar el reparto, no rebalancear hacia él.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Comprar lo que falta con dinero nuevo: sin impuestos, sin comisiones de venta, sin salir del mercado.
- Es la vía por defecto mientras aportes.
- Deja de bastar cuando la cartera es grande respecto a la aportación.
- «Cuántos meses tardaría solo aportando» es la comparación que hay que hacer antes de vender.

</div>
