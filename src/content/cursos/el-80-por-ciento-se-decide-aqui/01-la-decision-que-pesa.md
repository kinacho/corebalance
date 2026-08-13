---
titulo: "La decisión que pesa más que elegir el fondo"
descripcion: "Por qué el reparto entre tipos de activo explica casi toda la variación de tu resultado, y por qué casi todo el debate está en el 20 % que no importa."
orden: 1
gancho: "Se discute muchísimo sobre qué fondo comprar y casi nada sobre en qué proporción. Está al revés."
minutos: 7
arquetipo: desmontar
accion:
  texto: "Antes de seguir, escribe tus porcentajes objetivo en la herramienta. No hace falta que sean los definitivos: hace falta que estén escritos, porque el resto del curso los va a mover."
  cta: "Fijar mis pesos objetivo"
  href: "/dashboard"
lecturas:
  - texto: "Qué es el asset allocation y por qué decide casi todo"
    href: "/blog/que-es-asset-allocation"
  - texto: "La cartera Bogle para principiantes en España"
    href: "/blog/cartera-bogle-principiantes-espana"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
</script>

Si le preguntas a alguien qué cartera tiene te dirá nombres de fondos. ¿Por qué casi nunca te dice el reparto?

Mueve el porcentaje en bolsa y mira lo que cambia. Los fondos son los mismos en todos los casos:

<Mando
	etiqueta="Porcentaje en renta variable"
	min={0}
	max={100}
	paso={5}
	inicial={80}
	unidad=" %"
	etiquetaResultado="Lo que caería tu cartera si la bolsa cae un 40 %"
	calcular={(rv) => `−${(rv * 0.4).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %`}
	nota="Orden de magnitud, no previsión: supone que la renta fija no se mueve, que es optimista — en 2022 cayó a la vez. Va en la lección 3."
/>

## Lo que casi todo el mundo piensa aquí

Que elegir bien el fondo es la decisión importante y el reparto un ajuste posterior. Por eso los foros están llenos de comparativas entre dos indexados que se llevan cuatro céntimos, y vacíos de discusiones sobre proporciones.

<Comprueba
	pregunta="Dos personas tienen exactamente los mismos tres fondos. Una lleva el 80 % en bolsa y la otra el 40 %. ¿Cuánto se parecen sus carteras?"
	opciones={[
		{
			texto: 'Bastante: al final son los mismos productos',
			correcta: false,
			porque: 'Los productos son el envase. Lo que determina cuánto sube y cuánto cae una cartera es en qué proporción están, no cómo se llaman los fondos que hay dentro.'
		},
		{
			texto: 'En casi nada: son dos carteras distintas con los mismos ingredientes',
			correcta: true,
			porque: 'Es lo que dicen los estudios de atribución: la mayor parte de la variación del comportamiento de una cartera en el tiempo se explica por su política de asignación, no por qué productos concretos se eligieron dentro de cada clase.'
		},
		{
			texto: 'Se parecen en los años buenos y se diferencian en los malos',
			correcta: false,
			porque: 'Casi, y es un buen instinto, pero se diferencian en los dos: quien lleva más bolsa gana más cuando sube. No se puede comprar una mitad del trato sin la otra.'
		}
	]}
/>

## ¿Qué significa exactamente «el 80 % de tu resultado»?

Conviene entenderlo bien porque se cita mal muy a menudo. **No** dice que el reparto explique el 80 % de tu rentabilidad final. Dice que explica la mayor parte de sus **vaivenes**: cuánto sube en los años buenos y, sobre todo, cuánto cae en los malos.

Y cuando eliges un reparto estás fijando tres cosas a la vez, que son las tres la misma: cuánto puede caer, cuánto puede subir y cuánto vas a tener que aguantar. La última es el límite real, porque una cartera que abandonas rinde cero. Fíjate en que ninguna de las tres habla de productos: son decisiones sobre riesgo y sobre ti, y por eso nadie puede tomarlas en tu lugar — dependen de tu horizonte, de tu estabilidad de ingresos y de cuánto te vas a poner nervioso.

## El orden correcto de las preguntas

Casi todo el mundo empieza por «¿qué fondo compro?», sigue por «¿en qué bróker?» y termina con «ah, y ¿cuánto de cada cosa?».

El orden útil es el inverso: **cuánto de cada cosa, con qué bandas, y solo al final con qué producto**. Los dos primeros son tuyos y duran años; el tercero es intercambiable, porque si mañana aparece un fondo mejor sobre el mismo índice se traspasa y tu estrategia no se entera.

<div class="bloque aviso">

## Lo que no te van a contar

**El «80 %» se cita como una ley de la naturaleza y no lo es.** Sale de estudios sobre carteras institucionales con metodologías discutidas durante treinta años. La conclusión cualitativa aguanta; el número exacto, no.

**Y hay algo que pesa más que el reparto: cuánto ahorras.** Entre una tarde afinando el 80/20 y una revisando tus gastos fijos, la segunda rinde más.

**Y una tercera, incómoda aquí**: con treinta años por delante, la diferencia entre un 80/20 y un 90/10 se pierde en el ruido. Esto importa en los extremos.

</div>

<div class="bloque retener">

## Lo que hay que retener

- El reparto explica la mayor parte de los vaivenes; el producto concreto, casi nada.
- Al elegir un reparto eliges cuánto caes, cuánto subes y cuánto aguantas.
- El orden útil es reparto → bandas → producto. Casi todo el mundo lo hace al revés.
- Lo que ahorras pesa más que cómo lo repartes.

</div>
