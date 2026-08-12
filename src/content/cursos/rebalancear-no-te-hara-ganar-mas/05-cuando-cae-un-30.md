---
titulo: "Cuando el mercado cae un 30 %"
descripcion: "Qué hacer y qué no hacer en una caída fuerte, por qué la decisión se toma antes y cómo se ve una crisis pasada aplicada a tu propia cartera."
orden: 5
gancho: "El día que pase no vas a razonar bien. Por eso esta lección va de decidirlo ahora, que es cuando puedes."
minutos: 8
arquetipo: procedimiento
accion:
  texto: "Aplica a tu cartera la caída de 2000, la de 2008 y la de 2020. No es una predicción: es ver cuánto habrías perdido y cuántos meses habrías tardado en recuperarte, con y sin seguir aportando."
  cta: "Simular una crisis con mis cifras"
  href: "/herramientas/simulador-crisis"
lecturas:
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
  - texto: "Cuándo rebalancear la cartera"
    href: "/blog/cuando-rebalancear-cartera"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

En los últimos veinticinco años ha pasado tres veces. ¿Qué vas a hacer exactamente la próxima?

<Pasos
	titulo="Las tres cosas, por orden"
	pasos={[
		{
			titulo: 'No vendes',
			detalle: 'Está escrito en tu política de inversión. Por eso se escribe cuando estás tranquilo: el día de la caída, «no vendo» tiene que ser una decisión ya tomada y no una que estés tomando.'
		},
		{
			titulo: 'Sigues aportando',
			detalle: 'La aportación de un mes malo es la que más rinde a largo plazo. Si está automatizada, no tienes que decidirla — que es todo el objetivo de automatizarla.',
			aviso: 'Casi nadie cancela la estrategia entera. Lo que se cancela es «solo este mes, hasta que se aclare», y eso encadenado es lo mismo.'
		},
		{
			titulo: 'Miras si te has salido de banda, y solo entonces rebalanceas',
			detalle: 'Una caída desigual entre tus posiciones es el momento para el que las bandas existen: la parte que más ha caído es la que estás comprando barata.'
		}
	]}
/>

<Comprueba
	pregunta="Marzo de 2020, titulares de colapso. Rebalancear te dice que vendas bonos para comprar bolsa. ¿Qué tiene de difícil?"
	opciones={[
		{
			texto: 'Que probablemente no sea el suelo y puedas comprar demasiado pronto',
			correcta: false,
			porque: 'Cierto y secundario: nadie sabe dónde está el suelo, y por eso la regla no depende de acertarlo. Comprar pronto y que siga cayendo es un resultado previsto, no un fallo del plan.'
		},
		{
			texto: 'Que consiste en meter dinero justo en lo que se está hundiendo',
			correcta: true,
			porque: 'Funciona, y es incomodísimo. Cualquier plan que no reconozca eso no es un plan, es un deseo: la dificultad no es intelectual, es que hay que hacerlo con el estómago cerrado.'
		},
		{
			texto: 'Que en una caída fuerte no hay liquidez para operar',
			correcta: false,
			porque: 'En índices grandes no es un problema real ni en los peores días. La fricción está en la cabeza, no en el mercado.'
		}
	]}
/>

## Lo que de verdad pasa esos días

Conviene describirlo antes de que ocurra, porque la parte difícil no es la caída: es lo que la rodea. Los titulares no dicen «el mercado ha bajado un 30 %», dicen que esta vez es distinto y explican por qué con argumentos que suenan sólidos — y a menudo lo son, porque siempre hay una razón real detrás de una caída. Tu cartera deja de ser un número abstracto y pasa a ser una cifra concreta de dinero que ya no tienes, comparada mentalmente con lo que costaría un coche o una entrada de piso.

## ¿Cuál es la tentación de verdad?

No es vender: es **esperar a que se aclare**. Suena prudente, no exige admitir que estás asustado y tiene una ventaja perversa — nunca falla, porque siempre se puede seguir esperando un poco más. Casi todo el dinero que se pierde en una caída no se pierde vendiendo en el suelo: se pierde no estando dentro durante la recuperación, que empieza cuando nada se ha aclarado todavía y se parece bastante a un rebote más de los que ya han fallado tres veces.

Por eso los tres pasos de arriba están escritos como una lista y no como un criterio. Un criterio hay que interpretarlo, y ese día no vas a interpretar bien.

## ¿Y cuánto tarda en volver?

Es el número que casi nadie tiene en la cabeza, y el que más ayuda. El simulador aplica a tus cifras la forma real de tres crisis y te dice no solo cuánto habría caído tu cartera, sino **cuántos meses habría tardado en recuperarse**. La recuperación no es instantánea, y saber que hablamos de meses o de años cambia bastante lo que sientes cuando estás dentro de una.

Y hay una lectura secundaria que sale gratis: si el resultado te parece inaceptable, **el problema no es la crisis, es tu reparto**. La solución no es prepararte mejor psicológicamente para aguantar algo que no vas a aguantar; es bajar la parte de renta variable ahora, cuando puedes hacerlo con la cabeza fría y sin que te cueste dinero.

<div class="bloque aviso">

## Lo que no te van a contar

**«Comprar en la caída» suena mejor de lo que se ejecuta.** Nadie sabe si es el suelo, y casi todo el mundo que espera «un poco más abajo» se queda fuera de la recuperación. Aportar según tu calendario, sin acelerar ni frenar, es peor sobre el papel y mucho mejor en la práctica.

**El fondo de emergencia es lo que decide si aguantas.** Las caídas coinciden con recesiones y las recesiones con despidos: quien vende en el peor mes rara vez lo hace por pánico, lo hace porque necesita el dinero. Ninguna preparación mental sustituye a tener seis meses de gastos aparte.

**Y una caída del 30 % en un índice no es una caída del 30 % en tu cartera** — depende de tu reparto y de tu divisa. Por eso el simulador se ejecuta sobre tus cifras y no sobre un gráfico genérico.

</div>

<div class="bloque retener">

## Lo que hay que retener

- No vender, seguir aportando, rebalancear solo si te has salido de banda.
- La decisión se toma hoy, no el día que pase.
- El número que falta en la cabeza de casi todos es **cuántos meses** tarda la recuperación.
- Si el resultado simulado te parece inaceptable, cambia el reparto ahora.

</div>
