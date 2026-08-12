---
titulo: "Dónde se contrata y qué cambia entre un sitio y otro"
descripcion: "Comercializador de fondos, bróker de ETFs, custodia y qué pasa con tu dinero si la entidad quiebra. Lo que sí debe pesar en la decisión y lo que no."
orden: 4
gancho: "La pregunta no es cuál es el mejor bróker. Es qué cambia de verdad entre ellos, que son menos cosas de las que parece."
minutos: 7
arquetipo: procedimiento
accion:
  texto: "Cuando tengas cuenta, exporta tu CSV y súbelo. La app reconstruye tus posiciones, su coste medio y tu histórico sin que teclees nada."
  cta: "Ver cómo se importa"
  href: "/blog/importar-movimientos-myinvestor"
lecturas:
  - texto: "Importar movimientos de MyInvestor"
    href: "/blog/importar-movimientos-myinvestor"
  - texto: "Importar el CSV de DeGiro"
    href: "/blog/importar-csv-degiro"
  - texto: "Importar el CSV de Trading 212"
    href: "/blog/importar-csv-trading-212"
fuentes:
  - texto: "FOGAIN — Fondo General de Garantía de Inversiones: qué cubre y qué no"
    url: "https://www.fogain.com/"
  - texto: "CNMV — buscador de entidades registradas"
    url: "https://www.cnmv.es/portal/Consultas/BusquedaPorEntidad.aspx"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

De todo lo que se compara en una tabla de brókeres, ¿qué parte va a cambiar algo en tu cartera dentro de veinte años?

Este curso no te va a recomendar dónde abrir la cuenta: no cobramos por eso y la decisión depende de cifras que solo tú tienes. Lo que sí puede darte es el orden en que se decide.

<Pasos
	titulo="Lo que decide de verdad, en orden"
	pasos={[
		{
			titulo: 'Que tenga el producto que has elegido',
			detalle: 'Un catálogo enorme sirve de poco si le falta el fondo concreto. Búscalo por ISIN antes de abrir nada; es lo primero que descarta la mitad de las opciones.'
		},
		{
			titulo: 'Lo que te cuesta operar a tu ritmo',
			detalle: 'No la tarifa: la tarifa aplicada a cada cuánto aportas tú. Es la lección anterior, y es donde una comisión mínima pasa de barata a cara.'
		},
		{
			titulo: 'Si permite traspasos y en cuánto tiempo',
			detalle: 'Solo aplica a fondos, y es lo que decide si cambiar de idea dentro de cinco años es gratis o caro.',
			aviso: 'Este es el paso que se salta todo el mundo, porque parece un detalle administrativo. Es el que te ata o te libera.'
		},
		{
			titulo: 'Cómo te lo pone para declarar',
			detalle: 'Si retiene, si da un informe fiscal usable, si exporta un CSV decente. No se mira nunca y se agradece cada mes de junio.'
		}
	]}
/>

## ¿Comercializador o bróker?

Un **comercializador** te da acceso a fondos de inversión. Suele no cobrar por suscribir ni reembolsar, y es donde se hacen los traspasos; su catálogo es limitado a los fondos con los que tiene acuerdo. Un **bróker** te da acceso a mercados —ETFs, acciones, bonos—, cobra por operar y a veces custodia, y su catálogo es enorme.

Muchos inversores indexados españoles acaban con los dos, y no es incoherente: fondos donde se pueda traspasar, ETFs y acciones donde haga falta llegar a algo concreto. Lo que sí conviene es que la parte que vas a mover con el tiempo esté en fondos, porque es la única que se recoloca sin pasar por Hacienda. Dos cuentas cuestan papeleo cada junio; toda la cartera en el vehículo que no se traspasa cuesta bastante más el día que cambies de idea.

<Comprueba
	pregunta="Tu comercializador de fondos quiebra mañana. ¿Qué pasa con las participaciones que tenías contratadas a través de él?"
	opciones={[
		{
			texto: 'Siguen siendo tuyas y se traspasan a otra entidad',
			correcta: true,
			porque: 'Cuando compras un fondo no le prestas dinero a la entidad: tienes participaciones a tu nombre, custodiadas de forma segregada de su balance. No entran en el concurso de acreedores.'
		},
		{
			texto: 'Entran en el concurso y recuperas lo que quede a prorrata',
			correcta: false,
			porque: 'Eso pasaría con un depósito o con dinero prestado a la entidad, no con títulos segregados. Es la confusión más extendida y la que hace que mucha gente reparta la cartera en cinco sitios sin ganar nada.'
		},
		{
			texto: 'Las cubre el fondo de garantía hasta cierto importe',
			correcta: false,
			porque: 'El fondo de garantía de inversiones existe para cuando algo falla en la cadena —fraude, mala segregación—, no como red por defecto. En una quiebra ordenada no hace falta, porque los títulos nunca fueron de la entidad.'
		}
	]}
/>

## Lo que ninguna garantía cubre

Conviene decirlo claro, porque la respuesta de arriba tranquiliza y la de aquí no debería: **nada te protege de que el mercado caiga**, ni debe hacerlo. La segregación te protege del intermediario, no del activo. Si tu fondo pierde un 30 % porque la bolsa pierde un 30 %, todo ha funcionado exactamente como está diseñado.

Y una comprobación de treinta segundos que casi nadie hace: **busca la entidad en el registro de la CNMV** antes de mandar dinero. Si no está registrada para prestar ese servicio, ahí termina la conversación.

<div class="bloque aviso">

## Lo que no te van a contar

**La mayoría de comparativas de brókeres cobran por posicionar.** No todas, pero las suficientes como para que el orden de una lista no sea información. Si una comparativa no dice cómo se financia, asume que se financia con lo que compara.

**Cambiar de sitio no es tan caro como parece** si estás en fondos: los traspasas y no tributas. Si estás en ETFs sí lo es, porque vender realiza la ganancia. Un motivo más para saber en qué te metes desde el principio.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Comercializador para fondos y traspasos; bróker para ETFs y acciones. Tener los dos es normal.
- Los títulos son tuyos y están segregados: la quiebra del intermediario no se los lleva.
- El fondo de garantía cubre fallos de la cadena, **no** las caídas del mercado.
- Comprueba el registro de la CNMV. Es gratis y tarda medio minuto.

</div>
