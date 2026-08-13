---
titulo: "Tu World y tu S&P 500 apuntan a las mismas empresas"
descripcion: "Qué es el solapamiento entre fondos, por qué no se ve mirando nombres y cómo saber cuánto de tu dinero está comprando dos veces lo mismo."
orden: 1
gancho: "Tres fondos distintos pueden ser, en gran parte, veinte empresas repetidas. El folleto no te lo va a decir."
minutos: 7
arquetipo: dato
accion:
  texto: "Abre el mapa de lo que hay dentro de tus fondos. Te dice qué pares de posiciones apuntan a las mismas empresas y cuánto valor tienes duplicado. Si no tienes cartera todavía, la de ejemplo ya lo enseña."
  cta: "Ver mi solapamiento"
  href: "/dashboard"
lecturas:
  - texto: "IWDA vs VWCE: un fondo global o dos"
    href: "/blog/iwda-vs-vwce-comparativa"
  - texto: "Alternativas a Portfolio Performance"
    href: "/blog/alternativas-portfolio-performance"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
  import { solapamiento, INDICES } from '$lib/cursos-datos';

  const series = [
    { etiqueta: 'Está también en un S&P 500', valor: solapamiento('msci-world', 'sp500').deA, tono: 'a' },
    { etiqueta: 'Está también en un Nasdaq 100', valor: solapamiento('msci-world', 'nasdaq-100').deA, tono: 'b' }
  ];
</script>

Este curso va de mirar dentro. ¿Cuánto de tu fondo principal está ya dentro del siguiente que ibas a comprar?

<Barras
	series={series}
	unidad=" %"
	max={100}
	titulo="De tu MSCI World, qué parte comparte con otros índices"
	fuente={INDICES.procedencia.fuente}
	fecha={INDICES.procedencia.fecha}
	nota="Casi tres cuartas partes de un World son empresas estadounidenses grandes, que es exactamente lo que lleva un S&P 500."
/>

Tu bróker te enseña tres líneas, tres nombres y tres porcentajes, y parece diversificada. Pero un fondo no es una cosa: es una lista de empresas, y dos listas pueden compartir casi todo.

<Comprueba
	pregunta="Tienes un MSCI World, un S&P 500 y un Nasdaq 100 a partes iguales. ¿Cuántas carteras tienes?"
	opciones={[
		{
			texto: 'Tres: he repartido el riesgo entre tres índices distintos',
			correcta: false,
			porque: 'Los tres índices son distintos y las empresas de arriba son casi las mismas. Repartir entre productos que comparten contenido no reparte nada.'
		},
		{
			texto: 'Una, muy concentrada, repartida en tres productos',
			correcta: true,
			porque: 'Las mayores tecnológicas estadounidenses están en los tres, y en el Nasdaq pesan muchísimo. Es una apuesta concentrada con la sensación de ser tres cosas — y la sensación viene de mirar nombres en vez de contenido.'
		},
		{
			texto: 'Dos: el World y el S&P se solapan, pero el Nasdaq aporta algo distinto',
			correcta: false,
			porque: 'Es la intuición razonable, porque el Nasdaq suena a otra cosa. Pero casi todo lo que lleva ya estaba en los otros dos: lo que aporta no es variedad, es peso.'
		}
	]}
/>

## ¿Por qué no se ve?

Porque nadie enseña la composición combinada. El folleto de cada fondo enseña **su** composición; nadie multiplica por tu peso y suma. Y a mano no se puede: harían falta las posiciones completas de cada fondo, actualizadas.

Por eso esta herramienta lo calcula **a nivel de índice** y no de fondo individual: la composición real de un fondo cambia a diario y requiere un servicio de pago, mientras que los pesos de un índice se mueven despacio y se pueden mantener a mano, con su fecha y su nivel de confianza declarados. Es menos preciso y es comprobable, que a la larga vale más.

<Pasos
	titulo="Qué hacer con el resultado"
	pasos={[
		{
			titulo: 'Pregúntate si lo elegiste',
			detalle: 'Ver un solapamiento alto no es automáticamente malo. Si querías sobreponderar Estados Unidos, World + S&P 500 lo consigue: perfecto, siempre que sepas que eso es lo que estás haciendo.'
		},
		{
			titulo: 'Si no lo elegiste, corrige con lo nuevo',
			detalle: 'Deja de aportar al duplicado y redirige las aportaciones. No cuesta impuestos ni comisiones de venta.',
			aviso: 'Quitar el duplicado puede costar más de lo que arregla: si son ETFs con plusvalía, consolidar significa vender y tributar. La respuesta correcta a menudo es no deshacer nada.'
		},
		{
			titulo: 'Vuelve a mirarlo dentro de un año',
			detalle: 'Los pesos se mueven solos. Lo que hoy se solapa un 70 % puede solaparse más mañana sin que tú toques nada.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**El solapamiento no es «malo» por sí solo.** Un World y un emergentes no se solapan nada, y eso no los hace mejores que dos fondos que sí lo hagan: depende de si el resultado es la exposición que querías.

**Ninguna otra herramienta de cartera española enseña esto**, y no por dificultad técnica: es que las demás están hechas para responder «cuánto tengo» y «cuánto ha subido», no «qué tengo realmente».

</div>

<div class="bloque retener">

## Lo que hay que retener

- Un fondo es una lista de empresas; dos listas pueden compartir casi todo.
- World + S&P 500 no diversifica: concentra en lo que ya tenías.
- El solapamiento se calcula a nivel de índice, con fecha y confianza declaradas.
- No es malo por sí mismo. Es malo si no lo elegiste.

</div>
