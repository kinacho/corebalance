---
titulo: "Renta fija: para qué sirve y cuándo no sirve para nada"
descripcion: "Qué hace realmente la parte de bonos en una cartera indexada, por qué 2022 rompió la explicación habitual y cómo decidir tu porcentaje."
orden: 3
gancho: "La renta fija no está ahí para dar rentabilidad. Está para que aguantes la renta variable. Y en 2022 hizo justo lo contrario."
minutos: 9
arquetipo: desmontar
accion:
  texto: "Mira cuánto caería tu reparto actual en una crisis como 2000, 2008 o 2020, y cuántos meses tardaría en recuperarse. Luego cambia el porcentaje de bolsa y vuelve a mirar. Ese es el único criterio honesto para elegirlo."
  cta: "Simular una crisis con mi reparto"
  href: "/herramientas/simulador-crisis"
lecturas:
  - texto: "Qué es el asset allocation"
    href: "/blog/que-es-asset-allocation"
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

«Pon tu edad en bonos», «100 menos tu edad». ¿De dónde salen esas reglas y qué se supone que arreglan?

Aquí es donde casi todas las guías se ponen perezosas. Vamos a lo que la renta fija hace de verdad, que son dos cosas y ninguna es rendir.

<Comprueba
	pregunta="Llevas un 20 % en un fondo de renta fija global. La bolsa cae un 35 %. ¿Para qué te sirve exactamente ese 20 %?"
	opciones={[
		{
			texto: 'Para que la caída de la cartera sea menor',
			correcta: true,
			porque: 'Es su función principal y prácticamente la única: reducir la amplitud. Y esa diferencia es la que decide si sigues invertido o vendes en el peor mes, que es lo que de verdad determina tu resultado.'
		},
		{
			texto: 'Para compensar la caída: los bonos suben cuando la bolsa baja',
			correcta: false,
			porque: 'Eso pasó durante décadas y por eso se explica así, pero no está garantizado. En 2022 cayeron las dos cosas a la vez y la cartera 60/40 tuvo uno de sus peores años en un siglo.'
		},
		{
			texto: 'Para mejorar la rentabilidad a largo plazo',
			correcta: false,
			porque: 'Al revés: a largo plazo la renta variable rinde más, así que cada punto en renta fija es un punto de rentabilidad esperada que cambias por tranquilidad. Es un intercambio, no una mejora.'
		}
	]}
/>

## ¿Cuál es el segundo uso, el que casi nadie menciona?

**Da con qué comprar.** Si la bolsa cae un 35 % y tienes un 20 % en bonos, rebalancear significa vender algo que ha aguantado para comprar algo que está barato. Sin esa parte, rebalancear solo se puede hacer con dinero nuevo — y el dinero nuevo llega al ritmo de tu nómina, no al ritmo de las oportunidades.

## Lo que 2022 rompió

La explicación de arriba tiene un supuesto escondido: que cuando la bolsa cae, los bonos aguantan o suben. La subida rápida de tipos hizo caer las dos cosas a la vez, y los bonos de vencimiento largo cayeron tanto como muchas bolsas.

La lección no es «los bonos no sirven», que es la que sacó medio internet ese año. Es más incómoda: **la correlación entre activos no es una constante**. Una cartera que solo funciona si dos cosas se mueven en direcciones opuestas depende de algo que nadie te garantiza, y conviene saber que tu 60/40 tiene esa dependencia dentro. La reducción de amplitud sigue estando; la compensación automática no estaba prometida por nadie, solo por la costumbre de los últimos cuarenta años.

<Pasos
	titulo="Cómo decidir tu porcentaje, sin reglas de la edad"
	pasos={[
		{
			titulo: '¿Cuándo necesitas el dinero?',
			detalle: 'Si es en menos de cinco años, esa parte no debería estar en bolsa. Esto no es opinable ni depende de tu tolerancia.'
		},
		{
			titulo: '¿Cuánto puedes ver caer sin vender?',
			detalle: 'No lo que crees: lo que ya has vivido.',
			aviso: 'Si nunca has pasado una caída del 30 %, asume que te afectará más de lo que imaginas. Casi todo el mundo descubre su tolerancia real a la baja.'
		},
		{
			titulo: '¿Tienes fondo de emergencia?',
			detalle: 'Si no lo tienes, tu renta fija de facto es cero: un imprevisto te obligará a vender bolsa en el peor momento, que es exactamente lo que la renta fija venía a evitar.'
		}
	]}
/>

Con horizonte largo y colchón hecho, un 0-20 % es defendible. Lo que casi nunca lo es, para alguien con nómina y treinta años por delante, es un 40 %.

<div class="bloque aviso">

## Lo que no te van a contar

**«Renta fija» no es una cosa.** Deuda pública a corto, corporativa, emergentes en divisa local y bonos ligados a inflación se comportan de formas radicalmente distintas. Un fondo agregado global mete todo eso junto, y su duración media decide más que su nombre.

**En España tienes competencia directa**: depósitos y letras del Tesoro dan un tipo conocido sin riesgo de precio. Para la parte «que no quiero que caiga» suelen ser mejores que un fondo de bonos, que sí puede caer.

**Y el consejo habitual está sesgado por el pasado reciente.** Casi todo lo escrito sobre el 60/40 se escribió durante cuarenta años de tipos a la baja, el mejor entorno posible para los bonos.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La renta fija reduce caídas y da con qué comprar. No está para rendir.
- 2022 demostró que la descorrelación no está garantizada.
- Decide por horizonte y por lo que aguantas, no por tu edad.
- Sin fondo de emergencia, tu renta fija real es cero.

</div>
