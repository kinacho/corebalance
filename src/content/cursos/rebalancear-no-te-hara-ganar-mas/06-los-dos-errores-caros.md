---
titulo: "Los dos errores caros: hacerlo demasiado y no hacerlo nunca"
descripcion: "Los dos extremos que cuestan dinero de verdad, cómo reconocer en cuál estás y qué regla mínima evita los dos."
orden: 6
gancho: "Hay dos formas de equivocarse con esto, y son opuestas. La mayoría de la gente está claramente en una de las dos."
minutos: 7
arquetipo: decidir
accion:
  texto: "Deja escritos tu banda y tu frecuencia de revisión en la herramienta. Es lo único de todo este curso que se comprueba solo: cada vez que abras el panel te dirá si toca actuar, sin que tengas que acordarte de nada."
  cta: "Guardar mi regla"
  href: "/dashboard"
lecturas:
  - texto: "Cómo rebalancear una cartera indexada"
    href: "/blog/como-rebalancear-cartera-indexada"
  - texto: "Rebalanceo de ETFs en DeGiro: lo que cuestan las comisiones"
    href: "/blog/rebalanceo-degiro-etfs"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Última lección, y va de los dos extremos. ¿En cuál de los dos estás tú?

<Comprueba
	pregunta="No sabes a cuánto estás de tu objetivo y hace ocho meses que no miras. ¿En qué error estás y cuánto te está costando?"
	opciones={[
		{
			texto: 'En el caro: cada mes sin rebalancear tiene un coste que se acumula',
			correcta: false,
			porque: 'No hay ningún coste que se acumule mes a mes — de hecho durante un mercado alcista largo salir a la deriva suele dar más dinero. Si el error se notara en la cuenta, no sería el más común.'
		},
		{
			texto: 'En el más común, y lo que te cuesta no es dinero: es tener otra cartera',
			correcta: true,
			porque: 'La cartera deriva, y como derivar es lento nunca hay un día en que se note. No pagas nada por el camino: pagas de golpe el día que llega un ciclo malo y esa cartera cae como lo que de verdad es, no como lo que crees tener.'
		},
		{
			texto: 'En ninguno: si no has tocado nada, no has cometido ningún error',
			correcta: false,
			porque: 'No tocar nada es la mitad correcta de la regla. La otra mitad es mirar: sin revisión, «no he tocado nada» y «no me he enterado de nada» son indistinguibles desde dentro.'
		}
	]}
/>

## ¿Por qué los dos son difíciles de ver desde dentro?

El de **no hacerlo nunca** es cómodo y a veces rentable, y por eso persiste: durante mercados alcistas largos quien no rebalancea gana más, y cada año que pasa refuerza la impresión de que rebalancear es una tontería que solo recomiendan los libros. No hay ninguna señal de alarma hasta que llega el ciclo malo, y entonces la cartera cae como lo que de verdad es. Es un error que se cobra una sola vez, tarde y entero.

El de **hacerlo demasiado** tiene el problema contrario: se siente como diligencia. Cada ajuste parece cuidar la cartera, y el coste está repartido en comisiones pequeñas que nunca se suman en ningún sitio donde puedas verlas juntas. Quien opera de más suele saber perfectamente que no debería, así que no se corrige leyendo más — se corrige poniendo fricción: una regla escrita, una frecuencia fija y no abrir la cartera entre revisiones.

<Pasos
	titulo="La regla mínima que evita los dos"
	pasos={[
		{
			titulo: 'Reviso cada tres meses',
			detalle: 'Impide derivar durante años, que es el primer error. En el calendario, no en la memoria.'
		},
		{
			titulo: 'Ajusto solo lo que esté fuera de ±5 puntos',
			detalle: 'Impide operar por nada, que es el segundo. Si nada se ha salido, cierro y no toco.'
		},
		{
			titulo: 'Uso la aportación siempre que llegue',
			detalle: 'Elimina el coste, porque la primera herramienta es el dinero nuevo y no la venta.',
			aviso: 'Escríbela y déjala donde la vayas a ver. La parte comprobable —pesos y bandas— cabe en la herramienta, y ahí se comprueba sola.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**El error de no hacerlo nunca no se corrige con voluntad**, porque no hay un día en que duela. Se corrige con un recordatorio en el calendario, que es aburrido y funciona.

**Lo que sí se corrige con información** es lo que este curso ha intentado: que rebalancear no es para ganar más. Quien lo entiende deja de esperar un premio que no llega, y por tanto deja de abandonarlo cuando no llega.

</div>

## Ya está

Con el curso hecho tienes una regla escrita, tu próximo movimiento calculado con aportaciones y un plan para el día que caiga un 30 %.

Y una idea que no vas a leer en muchos sitios: **lo mejor que puede hacer una herramienta de rebalanceo es que la uses cuatro veces al año durante veinte años.** No todos los días.

<div class="bloque retener">

## Lo que hay que retener

- No hacerlo nunca: la cartera deriva a más riesgo del elegido, y se nota tarde.
- Hacerlo demasiado: comisiones e impuestos ciertos a cambio de nada.
- La regla mínima: revisión trimestral, banda de ±5 pp, y aportaciones primero.
- Rebalancear bien se parece mucho a no hacer casi nada.

</div>
