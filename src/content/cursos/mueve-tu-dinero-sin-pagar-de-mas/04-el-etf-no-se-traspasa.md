---
titulo: "Por qué un ETF no se traspasa aunque replique el mismo índice"
descripcion: "La diferencia legal entre un fondo y un ETF a efectos de traspaso, qué significa para una cartera que ya está en ETFs y cómo decidir sin precipitarse."
orden: 4
gancho: "Mismo índice, mismas empresas, mismo riesgo. Y uno se traspasa y el otro no. La diferencia no está en lo que compras: está en dónde cotiza."
minutos: 7
arquetipo: desmontar
accion:
  texto: "Comprueba qué tipo de instrumento tiene detectado cada una de tus posiciones. Es lo que decide si un traspaso es posible, y la app no propondrá traspasar nada que no lo sea."
  cta: "Revisar mis instrumentos"
  href: "/"
lecturas:
  - texto: "Fondos indexados vs ETFs en España"
    href: "/blog/fondos-indexados-vs-etfs-espana"
  - texto: "Rebalanceo de ETFs en DeGiro: lo que cuesta"
    href: "/blog/rebalanceo-degiro-etfs"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Dos productos con las mismas empresas dentro y el mismo riesgo. ¿Por qué solo uno se traspasa sin tributar?

<Comprueba
	pregunta="Tienes un ETF del MSCI World con plusvalía y quieres pasarte a un fondo indexado del MSCI World. ¿Tributas?"
	pista="Piensa en qué operación estás haciendo realmente al deshacerte del ETF."
	opciones={[
		{
			texto: 'No, porque el destino es un fondo traspasable',
			correcta: false,
			porque: 'Es la respuesta que da casi todo el mundo, y es la que más dinero cuesta. El destino no salva la operación: lo que importa es que las dos patas sean traspasables.'
		},
		{
			texto: 'Sí: vender el ETF es una venta en mercado, con o sin destino',
			correcta: true,
			porque: 'El ETF cotiza, así que no hay reembolso con la gestora: hay una venta a otro inversor en el mercado secundario. Y una venta realiza la ganancia, vaya el dinero a donde vaya después.'
		},
		{
			texto: 'Solo si el ETF y el fondo son de gestoras distintas',
			correcta: false,
			porque: 'La gestora no pinta nada aquí. Lo único que decide es si el producto cotiza o no, que es lo que define si hay reembolso o venta.'
		}
	]}
/>

## Dónde está exactamente la frontera

El régimen de diferimiento del artículo 94 aplica al reembolso y suscripción de participaciones de instituciones de inversión colectiva **no cotizadas**. Un ETF cotiza: se compra y se vende en un mercado secundario, como una acción. Así que no hay reembolso ni suscripción con la gestora, hay una venta a otro inversor.

Ese es todo el mecanismo. No es una decisión política contra los ETFs ni un privilegio de los fondos: es una consecuencia de cómo se compran. Y de ahí salen las cuatro combinaciones, que conviene tener claras porque la tercera sorprende a mucha gente:

| Movimiento | Qué es | Tributa |
|---|---|---|
| Fondo → fondo | Reembolso y suscripción | **No** |
| ETF → ETF | Venta y compra | Sí |
| ETF → fondo | Venta y suscripción | Sí |
| Fondo → ETF | Reembolso y compra | Sí |

Tener el dinero en un fondo no te da un pase: lo que importa es que **las dos patas** lo sean.

## ¿Y si ya estoy en ETFs?

Es una situación normal y no requiere ningún pánico. Lo que no conviene es hacer el movimiento reflejo, que es migrarlo todo de golpe: si tienes una plusvalía grande, pasarte a fondos hoy significa pagarla hoy, y el impuesto que evitarías en el futuro rara vez supera al que adelantas.

<Pasos
	titulo="Qué hacer en vez de migrar"
	pasos={[
		{
			titulo: 'Deja quieto lo que ya tienes',
			detalle: 'Sobre todo lo que más plusvalía acumula. Vender para «ordenarse» es pagar hoy por una comodidad futura.'
		},
		{
			titulo: 'Aporta lo nuevo donde quieras estar',
			detalle: 'Las aportaciones futuras no tienen coste fiscal: puedes ir construyendo la parte en fondos sin tocar nada de lo anterior.'
		},
		{
			titulo: 'Rebalancea comprando, no vendiendo',
			detalle: 'Es la vía sin impuesto para una cartera de ETFs, y la que esta app calcula por defecto.',
			aviso: 'Con una cartera grande y aportaciones pequeñas puede no llegar. Ahí toca decidir entre pagar o quedarse desviado, y esa cuenta es la lección 8.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**El ETF sigue ganando en otras cosas**: TER algo menor, más oferta y acceso a índices sin fondo equivalente. Si tu cartera no va a cambiar en veinte años, la ventaja del traspaso no se usa nunca — y entonces no vale nada.

**«Fondo» y «ETF» no siempre se distinguen bien en tu bróker**, y el ISIN no lo aclara: `IE00…` es igual de válido para las dos cosas. Lo que sí lo aclara es cómo se contrata, y es lo que esta app deduce para no proponerte un traspaso imposible.

**Y hay una zona gris que conviene no habitar**: productos que parecen fondos y no lo son a efectos del artículo 94. Si no eres capaz de identificar la figura legal, pregunta antes de contar con el diferimiento.

</div>

<div class="bloque retener">

## Lo que hay que retener

- El ETF cotiza, así que no hay reembolso: no hay diferimiento.
- Solo fondo → fondo evita el impuesto. Fondo → ETF también tributa.
- Si ya estás en ETFs: no migres por migrar, aporta donde quieras estar y rebalancea comprando.
- El ISIN no distingue un fondo de un ETF. Su forma de contratación, sí.

</div>
