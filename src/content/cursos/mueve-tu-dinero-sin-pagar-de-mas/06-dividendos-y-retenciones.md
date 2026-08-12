---
titulo: "Dividendos, retenciones y doble imposición"
descripcion: "Qué se te retiene cuando cobras un dividendo, qué pasa con los que vienen del extranjero y qué parte de todo esto ocurre dentro del fondo sin que la veas."
orden: 6
gancho: "Hay tres capas de impuesto sobre un dividendo y solo una aparece en tu declaración. Las otras dos ya te las cobraron."
minutos: 8
arquetipo: dato
accion:
  texto: "Pon tu capital y tu rentabilidad por dividendo: la calculadora aplica la escala año a año y te dice cuánto se lleva Hacienda por el camino frente a diferirlo dentro de un fondo de acumulación."
  cta: "Calcular el coste de cobrarlos"
  href: "/herramientas/acumulacion-vs-distribucion"
lecturas:
  - texto: "Dividendos de ETFs en DeGiro: retenciones y cómo declararlos"
    href: "/blog/dividendos-etfs-degiro"
  - texto: "MSCI World Acc vs Dist"
    href: "/blog/msci-world-acc-vs-dist"
---

<script>
  import CalculadoraAccDist from '$lib/components/cursos/CalculadoraAccDist.svelte';
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Un dividendo pasa por tres peajes antes de llegar a tu bolsillo. ¿Cuántos de ellos ves?

<Pasos
	titulo="Las tres capas, de la más invisible a la tuya"
	pasos={[
		{
			titulo: 'Dentro del fondo, antes de que exista para ti',
			detalle: 'Cuando una empresa estadounidense paga un dividendo a un fondo domiciliado en Irlanda, Estados Unidos retiene en origen. Ese dinero no llega nunca al fondo, así que tampoco a ti.',
			aviso: 'No aparece en tu declaración: aparece diluido y sin nombre dentro de la tracking difference. Es un coste real e invisible, y aquí el domicilio del fondo pesa más que si es de acumulación o de distribución.'
		},
		{
			titulo: 'Al llegarte, si el fondo reparte',
			detalle: 'En un fondo de distribución el dividendo entra en tu base del ahorro del ejercicio, con la escala de la lección 1, y tu entidad practica una retención a cuenta. En uno de acumulación no te llega: se reinvierte dentro y no hay hecho imponible.'
		},
		{
			titulo: 'La doble imposición, si cobras directo de acciones extranjeras',
			detalle: 'Pueden retenerte allí y tributar aquí. Los convenios permiten deducir parte, pero la deducción tiene límite, hay que pedirla en la declaración, y lo retenido de más se reclama en el país de origen con su papeleo.'
		}
	]}
/>

<Comprueba
	pregunta="Necesitas 10.000 € de tu cartera este año. ¿Qué tributa menos: cobrarlos en dividendos o vender participaciones por ese importe?"
	pista="Piensa sobre qué cantidad se calcula el impuesto en cada caso."
	opciones={[
		{
			texto: 'Los dividendos, porque ya vienen con la retención hecha',
			correcta: false,
			porque: 'La retención no es el impuesto, es un anticipo: si te retienen más de lo que te toca por escala se devuelve al declarar, y si menos, pagas la diferencia. Que te retengan no significa que ya esté todo hecho.'
		},
		{
			texto: 'Vender, porque solo tributa la ganancia y no el importe entero',
			correcta: true,
			porque: 'Al cobrar un dividendo tributa el importe completo; al vender participaciones tributa solo la plusvalía de lo vendido, que es una fracción. Para el mismo dinero en la mano, vender suele pagar bastante menos. Cuesta de creer y es de lo más útil de este curso.'
		},
		{
			texto: 'Es indiferente: los dos van a la base del ahorro',
			correcta: false,
			porque: 'Van a la misma base, cierto, pero no con la misma cantidad. Compartir escala es justamente lo que hace que un año con muchos dividendos empuje tus ventas a un tramo más alto.'
		}
	]}
/>

## ¿Cuánto cuesta cobrarlos, entonces?

Depende de tres cifras que son tuyas: cuánto tienes, cuántos años te quedan y qué rentabilidad por dividendo reparte lo que llevas. La calculadora aplica la escala progresiva año a año en vez de un tipo fijo, que es lo que hace que el resultado no se pueda estimar de cabeza.

<CalculadoraAccDist compacta />

<p class="pie-calc">Lo que cuesta cobrarlos frente a diferirlos, con la escala progresiva aplicada año a año.</p>

<div class="bloque aviso">

## Lo que no te van a contar

**El domicilio del fondo decide la primera capa y casi nadie lo mira.** Irlanda tiene un convenio con Estados Unidos que reduce la retención en origen; otros domicilios no tanto. Es la razón de que casi todos los indexados europeos serios sean irlandeses o luxemburgueses, y no aparece en ninguna comparativa Acc/Dist.

**Un año con muchos dividendos te sube el tramo de tus ventas**, porque comparten base. Es un efecto de segundo orden que nadie considera al elegir distribución.

**Y un fondo global te ahorra la tercera capa entera**, porque gestiona esas retenciones dentro. No es poca cosa: es la diferencia entre una declaración normal y una con formularios extranjeros.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Tres capas: retención en origen (invisible), tu tributación al cobrarlo, y la doble imposición si es directo.
- El domicilio del fondo decide la primera; Acc o Dist decide la segunda.
- La retención es un anticipo, no el impuesto final.
- Vender una parte suele tributar menos que cobrar el mismo importe en dividendos.

</div>
