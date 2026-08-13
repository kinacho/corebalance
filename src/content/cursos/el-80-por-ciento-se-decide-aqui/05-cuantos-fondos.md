---
titulo: "Cuántos fondos son demasiados"
descripcion: "Por qué añadir productos casi nunca añade diversificación, cómo se mide el solapamiento real y cuál es el número razonable de posiciones."
orden: 5
gancho: "Casi todas las carteras de seis fondos son una cartera de dos fondos con cuatro copias."
minutos: 7
arquetipo: dato
accion:
  texto: "Abre el mapa de solapamiento con tu cartera puesta. Te dice qué pares de posiciones apuntan a las mismas empresas y cuánto valor tienes duplicado. Es la única forma de contestar esta lección con tus datos."
  cta: "Ver mi solapamiento"
  href: "/dashboard"
lecturas:
  - texto: "IWDA vs VWCE: un fondo global o dos"
    href: "/blog/iwda-vs-vwce-comparativa"
  - texto: "La cartera Bogle para principiantes en España"
    href: "/blog/cartera-bogle-principiantes-espana"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
  import { solapamiento, INDICES } from '$lib/cursos-datos';

  const sp = solapamiento('msci-world', 'sp500');
  const nq = solapamiento('msci-world', 'nasdaq-100');

  const series = [
    { etiqueta: 'Del S&P 500 que añades, lo que ya estaba en tu World', valor: sp.deB, tono: 'a' },
    { etiqueta: 'Del Nasdaq 100 que añades, lo que ya estaba', valor: nq.deB, tono: 'b' }
  ];
</script>

La intuición dice que más fondos es más diversificación. ¿Y si con índices la intuición estuviera justo al revés?

<Barras
	series={series}
	unidad=" %"
	max={100}
	titulo="Lo que de verdad entra nuevo al añadir un fondo encima de un global"
	fuente={INDICES.procedencia.fuente}
	fecha={INDICES.procedencia.fecha}
	nota="Casi nada entra nuevo: lo que sube es el peso de lo que ya tenías."
/>

Un fondo indexado ya contiene cientos o miles de empresas. La diversificación no la da el número de **productos**, la da el número de **empresas distintas** y cuánto pesa cada una.

<Comprueba
	pregunta="Un amigo te enseña su cartera: World, S&P 500 y Nasdaq 100, a partes iguales. ¿Qué tiene realmente?"
	opciones={[
		{
			texto: 'Tres fondos, y por tanto tres apuestas repartidas',
			correcta: false,
			porque: 'Es lo que parece al leer la lista de nombres, y es exactamente por lo que este error es tan común: los tres se llaman distinto y los tres son índices reconocibles.'
		},
		{
			texto: 'Una apuesta concentrada en unas veinte empresas, repartida en tres productos',
			correcta: true,
			porque: 'Las mayores tecnológicas estadounidenses están en los tres, y en el Nasdaq pesan muchísimo. No es una cartera de tres cosas: es una cosa comprada tres veces, con la sensación de haber diversificado.'
		},
		{
			texto: 'Una cartera mal construida que hay que deshacer cuanto antes',
			correcta: false,
			porque: 'La primera parte es discutible —puede ser lo que quiere— y la segunda casi nunca es cierta: si son ETFs con plusvalía, deshacerla cuesta impuestos y a menudo sale mejor dejar de aportar al duplicado.'
		}
	]}
/>

## ¿Cómo se mide el solapamiento de verdad?

Dos preguntas, y las dos tienen respuesta numérica. **¿Qué valor tienes duplicado?** Si dos posiciones comparten empresas, parte de tu dinero está comprando lo mismo dos veces, y eso se calcula con la composición de los índices. **¿Cuánto se mueve tu exposición al añadir el producto?** Si tu reparto por región o por sector cambia en menos de un par de puntos, el producto no está haciendo nada.

Ninguna de las dos se responde leyendo la lista de fondos, que es como se responde casi siempre. Son exactamente lo que calcula el mapa de la herramienta, y la razón de que exista.

<Pasos
	titulo="El número razonable"
	pasos={[
		{
			titulo: 'Uno',
			detalle: 'Un global (All-World o ACWI). Cartera terminada: lleva desarrollados y emergentes en su peso de mercado.'
		},
		{
			titulo: 'Dos',
			detalle: 'World + emergentes. Lo mismo, pero decidiendo tú el peso de emergentes y rebalanceando entre ellos.'
		},
		{
			titulo: 'Tres',
			detalle: 'Los anteriores más renta fija, o más small caps si has decidido sostener ese factor durante décadas.'
		},
		{
			titulo: 'Cuatro o más',
			detalle: 'Exige una respuesta buena a «¿qué empresas me da esto que no tenga ya?».',
			aviso: 'Aquí es donde casi nadie se para. Las carteras no llegan a seis fondos por decisión: llegan añadiendo uno cada vez que se lee algo, y sin quitar ninguno.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**Quitar sobra menos de lo que parece.** Si son fondos, se traspasan sin tributar y consolidar es gratis. Si son ETFs, vender realiza plusvalías, y entonces la cartera desordenada puede salir más barata que la ordenada.

**Y hay un caso legítimo para tener el mismo índice dos veces**: tenerlo en dos entidades distintas, por si una falla o para no depender de un solo comercializador. Duplicar exposición a propósito, sabiendo que es eso, no es un error.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Más productos no es más diversificación: puede ser más concentración.
- World + S&P 500 es una apuesta a Estados Unidos, no un reparto.
- Mídelo: valor duplicado y cuánto se mueve tu exposición.
- Uno a tres fondos. Del cuarto en adelante, justifícalo.

</div>
