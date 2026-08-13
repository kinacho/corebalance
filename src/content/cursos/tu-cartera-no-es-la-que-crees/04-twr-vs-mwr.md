---
titulo: "TWR vs MWR: lo que rindió tu cartera y lo que rendiste tú"
descripcion: "Dos formas de medir la rentabilidad que casi nunca coinciden, qué mide cada una y por qué mirar solo una te da una idea equivocada de cómo lo estás haciendo."
orden: 4
gancho: "Tu cartera puede haber rendido un 8 % y tú un 4 %. Las dos cifras son correctas y miden cosas distintas."
minutos: 8
arquetipo: desmontar
accion:
  texto: "El panel te da las dos cifras sobre tu histórico real. Si nunca has aportado ni vendido en el periodo, coincidirán: la diferencia solo aparece cuando has movido dinero."
  cta: "Ver mis dos rentabilidades"
  href: "/dashboard"
lecturas:
  - texto: "Importar el CSV de Interactive Brokers"
    href: "/blog/importar-csv-interactive-brokers"
  - texto: "Importar movimientos de MyInvestor"
    href: "/blog/importar-movimientos-myinvestor"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

«¿Cuánto ha rendido mi cartera?» ¿Y si te dijera que tiene dos respuestas y las dos son ciertas?

<Comprueba
	pregunta="Tu cartera rindió un 8 % y tú un 4 %. ¿Qué significa esa diferencia?"
	opciones={[
		{
			texto: 'Que una de las dos cifras está mal calculada',
			correcta: false,
			porque: 'Las dos están bien. Miden preguntas distintas: qué hicieron tus activos, y qué le pasó a tu dinero con el tamaño que tenía en cada momento.'
		},
		{
			texto: 'Que metiste más dinero justo antes de los tramos malos',
			correcta: true,
			porque: 'La rentabilidad ponderada por dinero refleja cuándo y cuánto moviste; la ponderada por tiempo neutraliza eso a propósito, para poder comparar contra un índice. La resta de las dos es lo que suele llamarse el coste de tu timing.'
		},
		{
			texto: 'Que pagaste un 4 % en comisiones',
			correcta: false,
			porque: 'Las comisiones afectan a las dos cifras por igual, así que no explican la diferencia entre ellas. Una diferencia de cuatro puntos por comisiones sería, además, extraordinaria.'
		}
	]}
/>

## Qué mide cada una

La **TWR**, ponderada por tiempo, mide cómo se comportaron tus inversiones neutralizando el efecto de cuándo metiste o sacaste dinero. Es la cifra que publican los fondos y la correcta para **comparar**: si quieres saber si tu cartera lo hizo mejor o peor que un índice, esta es la que sirve, y aportar o vender no la mueve.

## ¿Y cuál mide lo que has hecho tú?

La **MWR**, ponderada por dinero, que sí tiene en cuenta cuándo y cuánto moviste. Es tu rentabilidad real como inversor: qué le pasó a tu dinero con el tamaño que tenía en cada momento, así que si aportaste mucho justo antes de una caída, la MWR lo refleja y la TWR no.

Ninguna de las dos es «la buena»: la primera evalúa la cartera y la segunda te evalúa a ti. Confundirlas es lo que hace que la gente se compare con un índice usando la cifra equivocada, y casi siempre en la dirección que desanima.

<Pasos
	titulo="Cómo leer la diferencia"
	pasos={[
		{
			titulo: 'MWR por debajo de TWR',
			detalle: 'Metiste más dinero justo antes de los tramos malos. Es el caso más común de quien aporta cada mes en un año que terminó peor de lo que empezó.'
		},
		{
			titulo: 'MWR por encima',
			detalle: 'Aportaste antes de los buenos. Disfrútalo y no lo confundas con habilidad.'
		},
		{
			titulo: 'Iguales',
			detalle: 'No has movido dinero en el periodo, o tus movimientos fueron neutrales.',
			aviso: 'Ojo con la conclusión moral: una MWR peor no significa que lo hicieras mal. Aportar cada mes es aportar también en los meses malos, que es exactamente lo que hay que hacer. La cifra no juzga tu disciplina, describe cómo cayeron las fechas.'
		}
	]}
/>

## ¿Qué hace falta para calcularlas?

Tu libro de operaciones. Sin las fechas y los importes de cada aportación y cada venta, la MWR **no se puede calcular**: no es una limitación de la herramienta, es que la pregunta no tiene respuesta sin esos datos. La TWR sí se puede aproximar con los valores de la cartera, pero la MWR necesita saber cuánto dinero había dentro en cada tramo, y eso solo lo dicen tus operaciones. Por eso importar el CSV del bróker es lo que convierte esta lección en un número tuyo en vez de un concepto.

<div class="bloque aviso">

## Lo que no te van a contar

**Casi todas las apps te enseñan solo una, y no dicen cuál.** Si tu bróker te da «rentabilidad» a secas, probablemente sea una MWR simplificada — o peor, una diferencia entre valor actual y dinero aportado, que no es ninguna de las dos y no es comparable con nada.

**Y hay un detalle técnico que cambia el resultado**: si una aportación se cuenta al principio o al final de su día. Si las dos cifras no usan la misma convención, la diferencia incluye un residuo que no es timing sino artefacto de cálculo. Aquí ambas usan la misma, y hay tests que lo fijan precisamente porque es el tipo de error que nadie nota.

**Los tramos estimados no entran.** En un caso medido, incluir dos días estimados subía la rentabilidad del periodo del 2,00 % al 13,33 %.

</div>

<div class="bloque retener">

## Lo que hay que retener

- TWR mide tus activos y sirve para comparar. MWR mide tu dinero.
- La diferencia es el efecto de cuándo moviste dinero.
- Una MWR peor no significa que lo hicieras mal.
- Sin libro de operaciones, la MWR no existe.

</div>
