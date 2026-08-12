---
titulo: "La primera aportación, y por qué la fecha da igual"
descripcion: "Aportar de golpe o repartido, automatizar el ingreso y qué hacer el día que tu cartera caiga un 30 %. La última lección del curso deja la orden lista."
orden: 7
gancho: "La evidencia dice que entrar de golpe gana más veces. Y aun así casi nadie debería hacerlo. Las dos cosas son verdad."
minutos: 8
arquetipo: procedimiento
accion:
  texto: "Antes de dar la orden, mira qué le pasaría a tu cartera en una crisis como 2000, 2008 o 2020, y cuántos meses tardaría en recuperarse. Es más fácil aguantar lo que ya has visto."
  cta: "Simular una crisis con mis cifras"
  href: "/herramientas/simulador-crisis"
lecturas:
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
  - texto: "Cuándo rebalancear la cartera"
    href: "/blog/cuando-rebalancear-cartera"
  - texto: "Cómo rebalancear una cartera indexada"
    href: "/blog/como-rebalancear-cartera-indexada"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Ya tienes el producto, el sitio y los pesos. ¿De verdad importa el día en que mandes el dinero?

Es donde la gente se atasca durante meses, así que conviene empezar por ahí.

<Comprueba
	pregunta="Tienes 30.000 € ahorrados y veinte años por delante. Meterlo todo de golpe o repartirlo en doce meses, ¿qué dicen los datos históricos?"
	opciones={[
		{
			texto: 'Repartir gana más veces: se compra a precio medio',
			correcta: false,
			porque: 'El precio medio suena a ventaja y no lo es. Repartir te deja fuera del mercado durante la subida media, y los mercados suben más años de los que bajan.'
		},
		{
			texto: 'De golpe gana más veces, aunque no siempre',
			correcta: true,
			porque: 'Es lo que sale al medirlo sobre series históricas largas, y por un motivo poco épico: el tiempo dentro del mercado es lo que paga. Pero «más veces» no es «siempre», y ahí empieza la parte que decides tú.'
		},
		{
			texto: 'Da exactamente igual: se compensa a largo plazo',
			correcta: false,
			porque: 'A veinte años la diferencia es pequeña comparada con lo que aportarás después, cierto. Pero no es cero, y sobre todo no es la única variable: la otra es si vas a aguantar.'
		}
	]}
/>

## ¿Por qué la respuesta correcta puede ser la peor?

La evidencia dice de golpe. Y aun así repartir es lo razonable para mucha gente, no por rentabilidad sino por **probabilidad de aguantar**. Si metes todo un lunes y el miércoles cae un 15 %, la pregunta no es cuánto has perdido: es si vas a vender. Una estrategia que abandonas rinde cero, y ese cero se come cualquier ventaja estadística.

La respuesta honesta, entonces, depende de una cifra que no está en ningún backtest. Si el importe es pequeño respecto a lo que vas a aportar en toda tu vida, entra de golpe y deja de pensarlo. Si es el ahorro de quince años y te quita el sueño, repártelo en unos meses y asume que probablemente te cueste algo: estás comprando la capacidad de no rendirte, y eso vale su precio.

## Lo que de verdad construye la cartera

Una cantidad fija, con una periodicidad fija, **automatizada**. Automatizada es la palabra importante, y no porque el día del mes importe —no importa—, sino porque una orden automática **no negocia contigo**: la decisión de aportar la tomas una vez, no doce veces al año con el periódico delante.

Sobre la fecha, para cerrarlo: cualquier análisis del «mejor día para aportar» encuentra un patrón en el pasado que no se repite. Elige el que te cuadre con la nómina y no vuelvas a pensarlo.

<Pasos
	titulo="El día que caiga un 30 %, que va a llegar"
	pasos={[
		{
			titulo: 'No vendes',
			detalle: 'Está escrito en tu política de inversión, y se escribe antes precisamente porque ese día no vas a decidir bien.'
		},
		{
			titulo: 'Sigues aportando',
			detalle: 'La aportación de un mes malo es la que más rinde a largo plazo.',
			aviso: 'Y es la que más cuesta hacer. Este es el paso que se salta todo el mundo: no se cancela la estrategia, se cancela «solo este mes».'
		},
		{
			titulo: 'Miras si te has salido de banda',
			detalle: 'Una caída desigual entre tus fondos es exactamente el momento para el que existen las bandas. Si te has salido, rebalanceas; si no, no tocas nada.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**Nadie sabe si es un buen momento para entrar.** Ni quien te dice que sí ni quien te dice que esperes. Si alguien lo supiera, no estaría escribiéndolo.

**El fondo de emergencia va antes que la primera aportación.** Si un imprevisto de 2.000 € te obliga a vender en el peor mes, ninguna optimización de TER te salva. Esto se dice poco porque no vende cursos.

**Y tu horizonte manda sobre todo lo demás.** Si vas a necesitar ese dinero en tres años, el problema es cuánto llevas en renta variable, no qué fondo.

</div>

## Ya está

Si has hecho los ejercicios, ahora tienes tu asignación escrita con sus porcentajes, el coste real de lo que has contratado y la primera orden decidida: qué, dónde, cuánto y cada cuánto.

Lo que viene después no es más teoría, es mantenerlo. Y ahí la pregunta pasa a ser «¿cuánto llevo desviado y qué me cuesta arreglarlo?», que es justo para lo que existe la herramienta.

<div class="bloque retener">

## Lo que hay que retener

- De golpe gana más veces; repartido se aguanta mejor. Elige sabiendo qué compras.
- Automatiza. Una orden automática no negocia contigo.
- No hay día bueno del mes.
- Decide hoy qué harás cuando caiga un 30 %, porque el día que caiga no vas a decidir bien.

</div>
