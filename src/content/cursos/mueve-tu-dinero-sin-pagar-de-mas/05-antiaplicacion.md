---
titulo: "La regla de antiaplicación: dos meses, o doce"
descripcion: "Si vendes con pérdidas y recompras demasiado pronto, esa pérdida no se integra este año. La ventana no es la misma para un fondo que para un ETF."
orden: 5
gancho: "Casi todo lo que leerás dice dos meses. Para las participaciones de un fondo son doce. La diferencia son diez meses y una pérdida que creías compensada."
minutos: 9
arquetipo: calcular
accion:
  texto: "Pon la fecha de tu venta con pérdidas y el tipo de producto. La herramienta te da la fecha exacta a partir de la cual puedes recomprar, y si la recompra que estás considerando bloquea la compensación."
  cta: "Calcular cuándo puedo recomprar"
  href: "/herramientas/cuando-puedo-recomprar"
lecturas:
  - texto: "Rebalancear sin pagar impuestos en España"
    href: "/blog/rebalancear-sin-pagar-impuestos-espana"
  - texto: "Traspasos de fondos indexados y Hacienda"
    href: "/blog/traspasos-fondos-indexados-hacienda"
fuentes:
  - texto: "Ley 35/2006 del IRPF, art. 33.5 f) y g) — pérdidas no computables"
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
---

<script>
  import CalculadoraRecompra from '$lib/components/cursos/CalculadoraRecompra.svelte';
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
</script>

Vendes con pérdidas para compensar ganancias. ¿Cuánto tienes que esperar antes de volver a comprar lo mismo?

Depende de qué vendiste, y la diferencia es enorme:

<Cifras fuente="Ley 35/2006 del IRPF, art. 33.5 f) y g)" fecha="Vigente en 2026">
	<Cifra
		valor="2"
		unidad=" meses"
		etiqueta="ETFs y acciones"
		matiz="Valores admitidos a negociación — letra f)."
	/>
	<Cifra
		valor="12"
		unidad=" meses"
		etiqueta="Participaciones de un fondo"
		matiz="No cotizan, así que caen en la letra g)."
		tono="mal"
	/>
</Cifras>

<Comprueba
	pregunta="Vendiste tu fondo indexado con pérdidas en marzo y leíste que a los dos meses ya podías recomprar. Recompras en junio. ¿Qué ha pasado?"
	opciones={[
		{
			texto: 'Nada: han pasado más de dos meses',
			correcta: false,
			porque: 'Es el error más extendido de toda la fiscalidad indexada española, y va en la dirección que más duele. Los dos meses son para valores admitidos a negociación en un mercado secundario oficial, y las participaciones de un fondo no cotizan.'
		},
		{
			texto: 'La pérdida no se integra este año: hacían falta doce meses',
			correcta: true,
			porque: 'Las participaciones se suscriben y se reembolsan con la gestora, así que caen en la letra g), que dice un año. Si te fiaste de una guía que decía dos meses, tienes una pérdida bloqueada y probablemente no lo sabes.'
		},
		{
			texto: 'Pierdo el derecho a esa pérdida para siempre',
			correcta: false,
			porque: 'Eso sería asustar de más. La pérdida se difiere, no se pierde: se declara igual en su ejercicio y se integra cuando transmitas definitivamente lo que recompraste. Lo que has perdido es el momento, no el derecho.'
		}
	]}
/>

<CalculadoraRecompra compacta />

<p class="pie-calc">Compruébalo con tus fechas antes de dar la orden.</p>

## La ventana rodea la venta, no la sigue

Este es el detalle que convierte la regla en una mina al rebalancear: comprar dentro de los dos —o doce— meses **anteriores** bloquea exactamente igual que comprar después. No es un plazo de espera posterior, es una ventana centrada en la venta.

Y así es como se activa sin que nadie haga nada raro: aportas en enero como todos los meses, en marzo ajustas pesos vendiendo una posición que está en pérdidas, y esa aportación de enero —que no tenía ninguna intención fiscal— acaba de bloquear la compensación. No hace falta intentar nada agresivo; basta con aportar periódicamente, que es justo lo que este curso recomienda hacer.

## ¿Y qué pasa exactamente con la pérdida bloqueada?

Se **difiere**. Se declara igual en el ejercicio en que se generó, no se integra en la base de ese año, y se integra cuando transmitas definitivamente las participaciones que recompraste. Por eso el panel fiscal de la app la excluye de la base imponible del año pero no la borra: sigue siendo tuya, solo que más tarde.

<div class="bloque aviso">

## Lo que no te van a contar

**«Homogéneos» no es «idénticos», y tampoco es «el mismo índice».** El criterio mira al emisor y a las características del valor: dos fondos distintos sobre el MSCI World, de gestoras distintas, no son homogéneos entre sí. Es precisamente la salida cuando quieres mantener la exposición sin bloquear la pérdida, y es zona donde conviene ir con cuidado y no con un artículo de internet.

**Un traspaso también es una adquisición.** Si traspasas a un fondo homogéneo dentro de la ventana, bloqueas igual: el traspaso te libra del impuesto sobre ganancias, no de esta regla.

**Y esto casi nunca aparece si no vendes con pérdidas**, que es algo que la estrategia intenta evitar. Aparece cuando rebalanceas en un mercado malo — exactamente cuando menos ganas de leer normativa tienes.

</div>

<div class="bloque retener">

## Lo que hay que retener

- 2 meses para ETFs y acciones. **12 para participaciones de fondos.**
- La ventana rodea la venta: comprar antes bloquea igual que comprar después.
- La pérdida no se pierde, se difiere al momento en que vendas lo recomprado.
- Un traspaso cuenta como adquisición a estos efectos.

</div>
