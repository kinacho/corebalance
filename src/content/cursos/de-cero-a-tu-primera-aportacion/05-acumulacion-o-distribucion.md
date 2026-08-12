---
titulo: "Acumulación o distribución: cuál te conviene y por qué"
descripcion: "Qué hace cada versión con los dividendos, cuánto cuesta fiscalmente cobrarlos y en qué momento de tu vida inversora tiene sentido cada una."
orden: 5
gancho: "La versión de acumulación no es «libre de impuestos». Es a plazos, y el plazo lo pones tú."
minutos: 8
arquetipo: decidir
accion:
  texto: "Pon tu capital, los años que te quedan y la rentabilidad por dividendo. La calculadora aplica los tramos del ahorro vigentes y te dice cuánto se lleva Hacienda por el camino en cada versión."
  cta: "Calcular la diferencia con mis cifras"
  href: "/herramientas/acumulacion-vs-distribucion"
lecturas:
  - texto: "MSCI World Acc vs Dist: la comparación en detalle"
    href: "/blog/msci-world-acc-vs-dist"
  - texto: "Dividendos de ETFs en DeGiro: retenciones y declaración"
    href: "/blog/dividendos-etfs-degiro"
fuentes:
  - texto: "Agencia Tributaria — rendimientos del capital mobiliario y base del ahorro"
    url: "https://sede.agenciatributaria.gob.es/"
---

<script>
  import CalculadoraAccDist from '$lib/components/cursos/CalculadoraAccDist.svelte';
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import { TRAMOS_AHORRO, ESCALA_AHORRO } from '$lib/cursos-datos';

  const tramos = TRAMOS_AHORRO.map((t) => ({
    etiqueta: t.hasta
      ? `Hasta ${t.hasta.toLocaleString('es-ES')} €`
      : `A partir de ${t.desde.toLocaleString('es-ES')} €`,
    valor: t.tipo
  }));
</script>

Mismo índice, mismas empresas, mismo riesgo: ¿por qué una versión acaba con más dinero que la otra?

Las empresas que hay dentro de tu fondo reparten dividendos, y la única diferencia entre las dos versiones es qué hace el fondo con ese dinero. **Acumulación** lo reinvierte dentro y no ves nada. **Distribución** te lo paga a la cuenta.

<Comprueba
	pregunta="Un fondo de acumulación reinvierte los dividendos sin pagártelos. Sobre esos dividendos, tú…"
	opciones={[
		{
			texto: 'No tributas nunca: por eso la acumulación es más eficiente',
			correcta: false,
			porque: 'Es la versión de esta idea que circula por los foros y es la que hace que la gente se lleve un susto al vender. El impuesto no desaparece.'
		},
		{
			texto: 'No tributas ahora, y pagas más al vender porque la ganancia es mayor',
			correcta: true,
			porque: 'Eso es exactamente lo que pasa: el dividendo reinvertido engorda el valor liquidativo, así que la plusvalía final es mayor y el impuesto también. Lo que ganas no es el impuesto, es el tiempo.'
		},
		{
			texto: 'Tributas igual, solo que lo declara la gestora por ti',
			correcta: false,
			porque: 'La gestora no declara nada por ti en un fondo de acumulación: no hay ningún hecho imponible en tu nombre mientras no reembolses.'
		}
	]}
/>

## Entonces, ¿dónde está la ventaja?

En **cuándo**, y solo en cuándo. Cuando cobras un dividendo tributa ese año en la base del ahorro, con esta escala:

<Barras
	series={tramos}
	unidad=" %"
	max={35}
	escala="rampa"
	titulo="Escala del ahorro"
	fuente={ESCALA_AHORRO.procedencia.fuente}
	fecha={ESCALA_AHORRO.procedencia.fecha}
	nota="Es progresiva: cada tramo se aplica solo a la parte que cae dentro de él, no a todo el importe."
/>

Y el problema no es el porcentaje, es que cada euro que pagas hoy es un euro que ya no compone los próximos veinte años. En un fondo de acumulación ese euro se queda dentro trabajando, y el impuesto se paga al final, sobre la ganancia total. Ojo con la palabra: no es que la acumulación **evite** el impuesto, lo **aplaza**. Y aplazar, con interés compuesto de por medio, vale dinero — cuánto exactamente depende de tres cifras que son tuyas.

<CalculadoraAccDist compacta />

<p class="pie-calc">Pruébalo con tus cifras: cambia el capital, los años y la rentabilidad por dividendo.</p>

## Cuándo la distribución tiene sentido

**Cuando quieres el ingreso.** Si vives de la cartera, cobrar el dividendo es más simple que vender participaciones cada trimestre — aunque fiscalmente vender una parte suele salir mejor, porque solo tributa la *ganancia* de lo vendido y no el importe entero.

**Cuando el producto que quieres solo existe en distribución.** Pasa con algunos índices y algunos mercados, y es una razón perfectamente válida.

<div class="bloque aviso">

## Lo que no te van a contar

**El fondo de acumulación también paga impuestos, solo que no los pagas tú.** Los dividendos que reciben las empresas del índice llevan retenciones en origen que el fondo soporta antes de reinvertir. Eso está dentro de la tracking difference de la lección 3, no en tu declaración.

**El domicilio del fondo importa más que Acc o Dist para esas retenciones.** Un fondo irlandés y uno luxemburgués no soportan lo mismo sobre dividendos estadounidenses, y eso no aparece en ninguna comparativa Acc/Dist.

**Y si ya tienes la versión que no querías, no corras.** Si es un fondo, traspasa sin tributar. Si es un ETF, cambiar significa vender, y ese impuesto puede superar años de ventaja.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La única diferencia es qué hace el fondo con el dividendo.
- Acumulación **aplaza** el impuesto; no lo elimina.
- Aplazar vale dinero porque lo no pagado sigue componiendo.
- Distribución tiene sentido si quieres el ingreso, o si es lo único que hay.
- Cambiar es gratis entre fondos y caro entre ETFs.

</div>
