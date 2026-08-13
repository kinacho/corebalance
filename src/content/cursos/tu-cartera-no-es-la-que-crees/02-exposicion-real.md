---
titulo: "Tu exposición real por región y por sector"
descripcion: "Cuánto tienes en Estados Unidos y en tecnología sin haberlo decidido, de dónde salen esos porcentajes y qué fiabilidad tienen."
orden: 2
gancho: "Casi nadie acierta su propio porcentaje en Estados Unidos. Suele ser bastante más de lo que cree."
minutos: 8
arquetipo: desmontar
accion:
  texto: "En el mapa, cambia entre la vista por región y la vista por sector. Fíjate en el porcentaje que queda fuera del cálculo: es la parte de tu cartera cuyo índice no está catalogado, y decirlo es más honesto que repartirlo a ojo."
  cta: "Ver mi reparto real"
  href: "/dashboard"
lecturas:
  - texto: "La cartera MSCI World + Emerging Markets"
    href: "/blog/cartera-msci-world-emerging-markets"
  - texto: "Qué es el asset allocation"
    href: "/blog/que-es-asset-allocation"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import { pesoRegion, pesoSector, INDICES } from '$lib/cursos-datos';

  const sectores = [
    { etiqueta: 'Tecnología', valor: pesoSector('msci-world', 'tech') },
    { etiqueta: 'Financieras', valor: pesoSector('msci-world', 'financials') },
    { etiqueta: 'Industriales', valor: pesoSector('msci-world', 'industrials') },
    { etiqueta: 'Salud', valor: pesoSector('msci-world', 'healthcare') },
    { etiqueta: 'Consumo discrecional', valor: pesoSector('msci-world', 'consumer_disc') },
    { etiqueta: 'Comunicación', valor: pesoSector('msci-world', 'communication') }
  ];
</script>

Elegiste dos fondos. ¿Elegiste también tu porcentaje en Estados Unidos y en tecnología?

<Cifras fuente={INDICES.procedencia.fuente} fecha={INDICES.procedencia.fecha}>
	<Cifra
		valor={pesoRegion('msci-world', 'us').toLocaleString('es-ES')}
		unidad=" %"
		etiqueta="Del MSCI World, en Estados Unidos"
	/>
	<Cifra
		valor={pesoSector('msci-world', 'tech').toLocaleString('es-ES')}
		unidad=" %"
		etiqueta="Del MSCI World, en tecnología"
		matiz="Y es el sector, no una empresa."
	/>
</Cifras>

Ninguno de los dos números lo decidiste tú. Salen de la ponderación por capitalización: un índice global pesa cada empresa por lo que vale en bolsa, así que la geografía y los sectores son **una consecuencia**.

<Comprueba
	pregunta="Descubres que tienes casi un 60 % en Estados Unidos sin haberlo decidido. ¿Qué haces?"
	opciones={[
		{
			texto: 'Corregirlo: nadie querría esa concentración a propósito',
			correcta: false,
			porque: 'Mucha gente sí la quiere, y con argumentos. Corregir por reflejo es sustituir una decisión que no tomaste por otra que tampoco has pensado.'
		},
		{
			texto: 'Probablemente nada, pero ahora sabiéndolo',
			correcta: true,
			porque: 'Que Estados Unidos pese mucho es lo que dice el mercado hoy, y no opinar es una postura defendible — la misma lógica del 80/20. Lo que no es defendible es creer que tienes «una cartera mundial repartida», que es una frase basada en un nombre.'
		},
		{
			texto: 'Añadir un fondo de Europa para compensar',
			correcta: false,
			porque: 'Puede ser razonable si es una decisión pensada sobre la moneda de tus gastos futuros. Como reacción a un número que acabas de ver, es cambiar la cartera con la última información que ha llegado, que es el hábito que este sitio intenta romper.'
		}
	]}
/>

## Los sectores, que casi nadie mira

Por el mismo mecanismo: si las empresas más grandes del mundo están en el mismo sector, tu índice global es en buena parte una apuesta sectorial que no elegiste.

<Barras
	series={sectores}
	unidad=" %"
	max={35}
	escala="rampa"
	titulo="Los seis sectores más pesados del MSCI World"
	fuente={INDICES.procedencia.fuente}
	fecha={INDICES.procedencia.fecha}
	nota="El resto se reparte entre consumo básico, energía, materiales, utilities e inmobiliario."
/>

Fíjate en lo que eso implica: la parte de tu cartera que está en tecnología no la puso ningún gestor ni la elegiste tú al contratar. La pusieron los precios. Si mañana las mayores tecnológicas duplican su valor y el resto se queda igual, tu porcentaje sectorial sube sin que hayas dado ninguna orden, y tu fondo seguirá haciendo exactamente lo que prometía hacer. No hay nada que arreglar ahí, pero sí algo que saber: **la composición de un índice es una foto, no un contrato**.

## ¿Y cuánto me puedo fiar de estos porcentajes?

Depende del índice, y por eso cada uno lleva declarada su procedencia: `factsheet` si está leído de la ficha oficial en una fecha concreta, `derived` si está calculado a partir de otros índices verificados, y `estimate` si es un orden de magnitud sin verificar. Si tu cartera contiene alguno del tercer tipo, la herramienta te lo dice en naranja en vez de callarse.

## ¿Y qué pasa con lo que no está catalogado?

Se declara. Hay un porcentaje de **valor no cubierto**: la parte de tu cartera cuyo índice no aparece en el registro. Los porcentajes se calculan sobre lo cubierto, no sobre el total, y ese hueco se enseña. Un reparto que suma exactamente 100 % siempre es sospechoso; el tuyo probablemente no lo suma, y eso es más honesto.

Y esa distinción cambia lo que puedes hacer con el número. Un porcentaje calculado sobre lo cubierto se compara con el de otro mes o con el de otra cartera; uno calculado sobre el total, cuando parte del total no está catalogado, mezcla exposición real con ignorancia y ya no significa nada concreto.

<div class="bloque aviso">

## Lo que no te van a contar

**«Sector» es más resbaladizo de lo que parece.** ¿Amazon es consumo discrecional o tecnología? ¿Tesla es automoción? Los proveedores de índices no coinciden, así que dos herramientas pueden darte repartos distintos y las dos tener razón.

**La exposición por país no es exposición a esa economía.** Una empresa cotizada en Estados Unidos puede facturar la mitad fuera: el reparto geográfico te dice dónde cotizan, no dónde ganan.

**Y lo que casi nunca se mira es la concentración por empresa.** En un índice ponderado por capitalización, las diez primeras pueden ser una fracción muy grande del total. Eso es riesgo real y no aparece en ningún reparto por región.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Tu geografía y tus sectores son consecuencia de la capitalización, no decisiones tuyas.
- No pasa nada por tenerlo. Pasa por no saberlo.
- Fíjate en la confianza declarada y en el porcentaje no cubierto.
- Dos herramientas pueden dar repartos sectoriales distintos y las dos ser correctas.

</div>
