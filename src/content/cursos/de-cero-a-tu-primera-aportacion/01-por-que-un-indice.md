---
titulo: "Por qué un índice le gana a casi todos los que cobran por intentarlo"
descripcion: "Qué es un índice, por qué replicarlo bate a la mayoría de la gestión activa y qué es exactamente lo que la indexación no te protege."
orden: 1
gancho: "No es que los gestores sean malos. Es que tienen que ganarte por más de lo que cobran, todos los años."
minutos: 7
arquetipo: desmontar
datos:
  - indices.worldEnEEUU
accion:
  texto: "Antes de seguir, mira cuánto se lleva una comisión del 1,5 % frente a una del 0,20 % sobre veinte años. No es una diferencia de céntimos."
  cta: "Abrir la calculadora de costes"
  href: "/herramientas/calculadora-ter"
lecturas:
  - texto: "Qué es el asset allocation y por qué decide casi todo"
    href: "/blog/que-es-asset-allocation"
  - texto: "La cartera Bogle para principiantes en España"
    href: "/blog/cartera-bogle-principiantes-espana"
fuentes:
  - texto: "SPIVA Scorecard (S&P Dow Jones Indices) — resultados de la gestión activa frente a su índice"
    url: "https://www.spglobal.com/spdji/en/research-insights/spiva/"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
</script>

¿Por qué un fondo que cobra siete veces más tiene que acertar todos los años solo para empatar?

Mueve la diferencia de comisión y mira lo que se lleva de 20.000 € en veinte años. El fondo no tiene que hacerlo mal: basta con que cobre.

<Mando
	etiqueta="Diferencia de comisión anual"
	min={0.1}
	max={2}
	paso={0.1}
	inicial={1.3}
	unidad=" %"
	etiquetaResultado="Lo que se lleva de 20.000 € en veinte años"
	calcular={(pp) => `${Math.round(20000 * (Math.pow(1.07, 20) - Math.pow(1.07 - pp / 100, 20))).toLocaleString('es-ES')} €`}
	nota="Aritmética, no una previsión: supone un 7 % anual antes de comisiones y ninguna aportación nueva. 1,3 puntos es la distancia entre un fondo que cobra el 1,5 % y uno que cobra el 0,20 %."
/>

## Lo que casi todo el mundo piensa aquí

Que un buen gestor se paga solo. Y es una idea razonable, porque en casi cualquier otro oficio funciona así: un cirujano caro opera mejor que uno barato, y nadie elige al fontanero por precio.

La bolsa tiene una peculiaridad que rompe esa analogía. No es que los gestores sean peores de lo que dicen.

<Comprueba
	pregunta="Todos los inversores del mundo a la vez —fondos, bancos, particulares, hedge funds—, antes de comisiones, obtienen…"
	pista="No hay trampa en la pregunta: piensa en quiénes son «todos» juntos."
	opciones={[
		{
			texto: 'Más que el mercado, porque los profesionales mueven la mayor parte del dinero',
			correcta: false,
			porque: 'Es la intuición habitual y falla por un motivo de bulto: los profesionales no compiten contra el mercado, ellos SON casi todo el mercado. No hay a quién ganarle si eres el promedio.'
		},
		{
			texto: 'Exactamente la rentabilidad del mercado, ni más ni menos',
			correcta: true,
			porque: 'El mercado es la suma de todos los que están dentro. Para que alguien lo bata, otro tiene que quedarse por debajo exactamente en lo mismo. Antes de comisiones es un juego de suma cero, y eso no es una opinión sobre nadie: es contabilidad.'
		},
		{
			texto: 'Menos, porque siempre hay quien se equivoca',
			correcta: false,
			porque: 'Los errores no evaporan dinero, lo trasladan: lo que uno pierde por vender barato lo gana quien le compró. En agregado y antes de costes, se compensan.'
		}
	]}
/>

## La cuenta, ahora entera

Si todos juntos obtienen la rentabilidad del mercado antes de comisiones, después de comisiones obtienen la rentabilidad del mercado **menos lo que han pagado**. No hay forma de que el conjunto escape de ahí.

Y de ahí sale la regla que importa: para darte más que el índice, un fondo activo no tiene que ganarle. Tiene que ganarle **por más de lo que te cobra**, y hacerlo un año, y el siguiente, y el siguiente. Algunos lo consiguen. El problema es saber cuáles **de antemano**, porque los que lo lograron los últimos cinco años no son sistemáticamente los que lo logran los cinco siguientes. Los informes SPIVA de S&P llevan dos décadas midiendo esto mercado por mercado, y la conclusión se repite: a diez y quince años, la mayoría de fondos activos se queda por debajo de su propio índice de referencia.

## ¿Qué es un índice, entonces?

Una **lista con una regla**. El MSCI World dice «las empresas grandes y medianas de 23 países desarrollados, ponderadas por lo que valen en bolsa». Nadie decide qué entra por corazonada: entra lo que cumple la regla.

Un fondo indexado se limita a comprar esa lista. No intenta acertar, y por eso puede cobrar poco. Ahí está toda la historia.

Fíjate en lo que esto significa para tu decisión: el coste es **lo único del futuro que conoces con certeza**. No sabes qué hará la bolsa el año que viene, pero sabes exactamente lo que te van a cobrar por participar en ella.

<div class="bloque aviso">

## Lo que no te van a contar

**Indexarte no te protege de las caídas.** Si el mercado cae un 40 %, tu fondo indexado cae un 40 %: no hay nadie al volante intentando esquivarlo, que es justo lo que lo hace barato.

**«El índice» no existe en singular.** El MSCI World no es «la bolsa mundial»: son países desarrollados, sin emergentes, y a fecha de su última ficha el 72,5 % está en Estados Unidos. Es una decisión que tomas aunque no te des cuenta, y va en la lección 6.

**El comportamiento pesa más que el producto.** El inversor medio en fondos indexados obtiene menos que sus propios fondos, porque compra después de subir y vende después de caer.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Un índice es una lista con una regla; un fondo indexado la copia sin opinar.
- Todos los inversores juntos SON el mercado: antes de costes, nadie gana en agregado.
- Por eso batir al índice exige ganarle **por más de lo que cobras**, todos los años.
- El coste es lo único del futuro que conoces con certeza.
- Indexarse elimina el riesgo de elegir mal al gestor, no el riesgo de mercado.

</div>
