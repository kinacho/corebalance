---
titulo: "Vender para rebalancear: la factura exacta"
descripcion: "Cómo se compara la vía del traspaso con la de vender, por qué la respuesta depende de tus operaciones y no de una regla general, y cuándo compensa esperar."
orden: 8
gancho: "«¿Traspaso o vendo?» no tiene una respuesta buena en abstracto. Con tus fechas y tus importes, tiene una y es un número."
minutos: 9
arquetipo: calcular
accion:
  texto: "El panel fiscal empareja lo que sobra con lo que falta dentro de cada bloque, hace primero todos los pares fondo→fondo para maximizar la parte sin tributar, y te dice qué te costaría el resto. Además simula cuántos meses tardarías en corregirlo solo con aportaciones."
  cta: "Ver mi plan con las dos vías"
  href: "/"
lecturas:
  - texto: "Rebalanceo en MyInvestor sin impuestos"
    href: "/blog/rebalanceo-myinvestor-sin-impuestos"
  - texto: "Rebalanceo de ETFs en DeGiro: comisiones e impuestos"
    href: "/blog/rebalanceo-degiro-etfs"
  - texto: "Cómo rebalancear una cartera indexada"
    href: "/blog/como-rebalancear-cartera-indexada"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
</script>

Tienes la cartera desviada. ¿Cuál de las cuatro salidas te sale más barata?

<Pasos
	titulo="Las cuatro vías, por orden de coste"
	pasos={[
		{
			titulo: 'No hacer nada todavía',
			detalle: 'Si estás fuera de banda por poco y sigues aportando, quizá vuelvas dentro solo. Coste cero, y es la que nadie calcula.'
		},
		{
			titulo: 'Con aportaciones',
			detalle: 'Compras lo que falta con dinero nuevo y no vendes nada. Coste fiscal cero; el coste es que tarda lo que tarde tu nómina. Es lo que esta app calcula primero.'
		},
		{
			titulo: 'Con traspasos',
			detalle: 'Mueves de lo que sobra a lo que falta, fondo a fondo, por el artículo 94. Coste fiscal cero; el coste son los días fuera de mercado.',
			aviso: 'Solo funciona si las dos patas son fondos. Un solo ETF en el par y esta vía desaparece, aunque el otro lado sea traspasable.'
		},
		{
			titulo: 'Vendiendo',
			detalle: 'Realizas la ganancia y pagas lo que salga de aplicar FIFO y la escala. Es la única vía cuando hay ETFs o acciones de por medio.'
		}
	]}
/>

<Comprueba
	pregunta="¿Por qué «¿traspaso o vendo?» no tiene una respuesta general que sirva para todos?"
	opciones={[
		{
			texto: 'Porque depende de cuánto haya subido el mercado ese año',
			correcta: false,
			porque: 'Influye poco: lo que importa no es lo que ha subido el mercado, sino lo que ha subido tu posición desde tus compras concretas, que es otra cosa.'
		},
		{
			texto: 'Porque depende de cuatro cosas que solo están en tus operaciones',
			correcta: true,
			porque: 'Qué plusvalía llevas por FIFO sobre tus fechas, cuánto has realizado ya este año —la escala se acumula—, si las dos patas son traspasables y cuánto aportas al mes. Cambia una y cambia la decisión.'
		},
		{
			texto: 'Porque la normativa cambia todos los años',
			correcta: false,
			porque: 'Los tipos han cambiado tres veces en una década, cierto, pero el mecanismo es estable. La variabilidad que impide una respuesta general está en tus datos, no en el BOE.'
		}
	]}
/>

## ¿Cuánto tardarías en corregirlo sin vender nada?

Es la comparación honesta, y casi nadie la hace: no es «arreglarlo hoy» contra «no arreglarlo», sino **arreglarlo hoy pagando X contra arreglarlo en N meses pagando cero**.

<Mando
	etiqueta="Lo que aportas cada mes"
	min={100}
	max={2000}
	paso={50}
	inicial={400}
	unidad=" €"
	etiquetaResultado="Meses para cubrir una desviación de 3.000 €"
	calcular={(m) => `${Math.ceil(3000 / m)} meses`}
	nota="Suponiendo que dirijas toda la aportación a lo que falta y que los pesos no se muevan más por el camino. El panel de la app hace esta misma cuenta con tu desviación real."
/>

Si la respuesta son tres meses, esperar suele ganar a cualquier cálculo fiscal. Si son cuatro años, esperar es una excusa y toca decidir de verdad.

<div class="bloque aviso">

## Lo que no te van a contar

**El impuesto no es el único coste de vender.** Comisiones, horquilla, cambio de divisa y días fuera de mercado suman; en carteras pequeñas pueden superar al fiscal.

**Y el impuesto que pagas hoy no está «perdido»**: lo habrías pagado igual el día que vendieras de verdad. Lo que pierdes es el rendimiento de ese dinero durante los años intermedios — real, pero menos de lo que dice la intuición, y la razón de que con plusvalías pequeñas vender no sea ningún drama.

**Ninguna de estas cifras es asesoramiento fiscal.** Son estimaciones sobre la normativa vigente, con los artículos citados para que puedas comprobarlas. Si el importe es grande, esto te sirve para llegar informado a una asesoría, no para sustituirla.

</div>

## Ya está

Con el curso hecho tienes la factura exacta de tu próximo movimiento calculada sobre tus operaciones, la fecha desde la que puedes recomprar sin bloquear una pérdida, y un criterio para elegir vía en vez de adivinar.

Y sobre todo sabes que en España existe una figura —el traspaso— que hace que casi ningún error de cartera sea irreversible. Eso es lo que ninguna herramienta internacional te va a decir.

<div class="bloque retener">

## Lo que hay que retener

- Orden de coste: esperar, aportaciones, traspasos, y solo al final vender.
- La respuesta depende de tu FIFO, de lo ya realizado este año y de si las dos patas son fondos.
- «Esperar N meses» es una opción real y hay que compararla.
- El impuesto no desaparece por diferirlo; lo que ganas es el rendimiento del intervalo.

</div>
