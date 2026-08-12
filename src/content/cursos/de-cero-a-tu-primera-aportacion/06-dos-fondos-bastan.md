---
titulo: "Dos fondos bastan"
descripcion: "World más emergentes, o un solo fondo global. Por qué añadir productos casi nunca añade diversificación y cómo comprobar si los tuyos se solapan."
orden: 6
gancho: "Casi todas las carteras de seis fondos son una cartera de dos fondos con cuatro copias."
minutos: 9
arquetipo: dato
accion:
  texto: "Define tus dos posiciones y sus pesos objetivo en la cartera de ejemplo. Luego abre el mapa de lo que hay dentro: verás en qué se solapan y qué exposición real tienes por región."
  cta: "Montar la cartera de ejemplo"
  href: "/"
lecturas:
  - texto: "La cartera MSCI World + Emerging Markets: el 80/20 explicado"
    href: "/blog/cartera-msci-world-emerging-markets"
  - texto: "IWDA vs VWCE: un fondo o dos"
    href: "/blog/iwda-vs-vwce-comparativa"
  - texto: "Qué es el asset allocation"
    href: "/blog/que-es-asset-allocation"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import { pesoRegion, solapamiento, INDICES } from '$lib/cursos-datos';

  const solape = solapamiento('msci-world', 'sp500');

  const series = [
    { etiqueta: 'De tu MSCI World, lo que ya está en el S&P 500', valor: solape.deA, tono: 'a' },
    { etiqueta: 'Del S&P 500 que añades, lo que ya tenías', valor: solape.deB, tono: 'b' }
  ];
</script>

Antes de elegir cuántos fondos vas a tener, ¿sabes qué parte del mundo compras con uno solo?

<Cifras fuente={INDICES.procedencia.fuente} fecha={INDICES.procedencia.fecha}>
	<Cifra
		valor={pesoRegion('msci-world', 'us').toLocaleString('es-ES')}
		unidad=" %"
		etiqueta="Del MSCI World está en Estados Unidos"
		matiz="Son países desarrollados: no lleva emergentes."
	/>
	<Cifra
		valor={pesoRegion('ftse-all-world', 'us').toLocaleString('es-ES')}
		unidad=" %"
		etiqueta="Del FTSE All-World está en Estados Unidos"
		matiz="Este sí lleva emergentes, y aun así."
	/>
</Cifras>

No es una elección que hayas hecho: es la consecuencia de ponderar por capitalización, y es lo que el mercado dice hoy. Cambiará solo, sin que tú hagas nada.

<Comprueba
	pregunta="Tienes un fondo del MSCI World y añades uno del S&P 500 «para reforzar Estados Unidos». ¿Qué acabas de hacer con tu diversificación?"
	opciones={[
		{
			texto: 'Mejorarla: ahora tengo dos fondos en vez de uno',
			correcta: false,
			porque: 'Contar productos no mide nada. Lo que importa es cuántas empresas distintas hay debajo y con qué peso, y ahí los dos fondos casi se pisan.'
		},
		{
			texto: 'Dejarla igual y concentrar más la cartera en lo que ya tenía',
			correcta: true,
			porque: 'Las empresas del S&P 500 ya estaban dentro del World. No entra nada nuevo: sube el peso de lo que ya pesaba más. Puede ser lo que quieres, pero conviene saber que es eso.'
		},
		{
			texto: 'Empeorarla, porque el S&P 500 tiene menos empresas',
			correcta: false,
			porque: 'Casi, pero el matiz importa: el problema no es el fondo que añades, es que se superpone al que ya tenías. El mismo S&P 500 como única posición sería otra conversación.'
		}
	]}
/>

<Barras
	series={series}
	unidad=" %"
	max={100}
	titulo="Cuánto comparten un MSCI World y un S&P 500"
	fuente={INDICES.procedencia.fuente}
	fecha={INDICES.procedencia.fecha}
	nota={solape.nota}
/>

## Entonces, ¿uno o dos?

**Dos fondos**: un **MSCI World** te da unas 1.400 empresas grandes y medianas de 23 países desarrollados, y le falta un trozo del mundo, los emergentes, que se añade con un segundo fondo. La proporción habitual ronda el 80/20, que es aproximadamente lo que los emergentes pesan en la bolsa mundial. No es un número mágico: es «déjalo como está el mundo y no opines».

**Un fondo**: uno sobre el FTSE All-World o el MSCI ACWI ya incluye desarrollados y emergentes. Nada que rebalancear entre ellos, una orden al mes, imposible desviarse. A cambio, normalmente un TER algo mayor y pierdes la capacidad de decidir tú el peso de emergentes.

Para la mayoría de gente que empieza, un solo fondo global es la respuesta correcta. Decirlo no da clics, pero es verdad.

<div class="bloque aviso">

## Lo que no te van a contar

**Añadir fondos casi nunca añade diversificación.** Un World, un S&P 500 y un Nasdaq 100 son, en gran medida, las mismas veinte empresas tres veces. Lo que sube no es tu diversificación: es tu concentración.

**El sesgo local es una decisión, no un descuido.** Que España pese poco en un índice mundial es correcto —pesa poco—, pero tus gastos futuros son en euros. Añadir algo de Europa es defendible; añadir un fondo del IBEX «porque es lo nuestro» es otra cosa.

**Y el 80/20 no está grabado en piedra.** El peso real de emergentes se mueve, y hay quien argumenta pesos por PIB en vez de por capitalización. Elige uno, escríbelo y **cúmplelo**: la coherencia rinde más que la optimización.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Dos fondos (World + emergentes) o uno global. Las dos son respuestas correctas.
- El 80/20 es «como está el mundo», no una apuesta.
- Un fondo mundial ya está muy concentrado en EE. UU. Añadir S&P 500 lo concentra más.
- Contar productos no mide diversificación; mirar lo que hay debajo, sí.

</div>
