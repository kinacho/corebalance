---
titulo: "La base del ahorro: los tramos y cómo se te acumulan"
descripcion: "Cómo tributan las ganancias y los dividendos en España, por qué la escala es progresiva y qué significa que todo se sume en la misma base."
orden: 1
gancho: "No hay «un 19 % de impuestos». Hay una escala, y lo que pagas por el último euro depende de todo lo que ganaste antes ese año."
minutos: 7
arquetipo: dato
accion:
  texto: "La calculadora aplica esta escala año a año sobre un caso concreto. Cambia el capital y verás cómo el tipo efectivo se mueve sin que tú toques ningún porcentaje."
  cta: "Ver la escala en funcionamiento"
  href: "/herramientas/acumulacion-vs-distribucion"
lecturas:
  - texto: "MSCI World Acc vs Dist: el impuesto que se aplaza"
    href: "/blog/msci-world-acc-vs-dist"
fuentes:
  - texto: "Agencia Tributaria — base imponible del ahorro"
    url: "https://sede.agenciatributaria.gob.es/"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
  import { TRAMOS_AHORRO, ESCALA_AHORRO } from '$lib/cursos-datos';
  import { calculateSavingsTax } from '$lib/fiscal';

  const tramos = TRAMOS_AHORRO.map((t) => ({
    etiqueta: t.hasta
      ? `Hasta ${t.hasta.toLocaleString('es-ES')} €`
      : `A partir de ${t.desde.toLocaleString('es-ES')} €`,
    valor: t.tipo
  }));
</script>

Todo este curso cuelga de una sola pregunta: ¿cuánto se lleva Hacienda del euro que acabas de ganar?

Depende de los euros anteriores. Tu cartera no tributa a un tipo, tributa en una escala:

<Barras
	series={tramos}
	unidad=" %"
	max={35}
	escala="rampa"
	titulo={`Escala del ahorro · ejercicio ${ESCALA_AHORRO.anio}`}
	fuente={ESCALA_AHORRO.procedencia.fuente}
	fecha={ESCALA_AHORRO.procedencia.fecha}
	nota="Estas tarifas han cambiado tres veces en una década. En esta app viven en una constante con su año, precisamente para que nadie las lea como eternas."
/>

<Comprueba
	pregunta="Vendes con una ganancia de 8.000 €. ¿Cuánto pagas?"
	pista="Los dos primeros tramos son el 19 % hasta 6.000 € y el 21 % a partir de ahí."
	opciones={[
		{
			texto: 'El 21 % de 8.000 €, porque entro en el segundo tramo',
			correcta: false,
			porque: 'Es el error más común con cualquier escala progresiva, y el que hace que la gente crea que le compensa ganar menos. Entrar en un tramo no reprecia lo anterior.'
		},
		{
			texto: 'El 19 % de los primeros 6.000 y el 21 % de los 2.000 restantes',
			correcta: true,
			porque: 'Cada tramo se aplica solo a la parte que cae dentro de él. Por eso el tipo efectivo —lo que pagas dividido entre lo que ganas— siempre sale por debajo del marginal.'
		},
		{
			texto: 'El 19 %, porque es el tipo de las ganancias patrimoniales',
			correcta: false,
			porque: 'El 19 % es solo el primer tramo. Se cita tanto como «el impuesto de las plusvalías» que mucha gente calcula con él carteras enteras.'
		}
	]}
/>

## ¿Por qué tu cartera no tributa como tu nómina?

En el IRPF tus ingresos van a dos sitios. La **base general** lleva tu nómina, los alquileres y las actividades económicas, con una escala alta y muy progresiva. La **base del ahorro** lleva intereses, dividendos y ganancias patrimoniales — lo que ganas al vender una inversión.

Tu cartera vive en la segunda, y eso son dos buenas noticias en una: los tipos son más bajos y **no se mezclan con tu sueldo**. Que ganes 10.000 € vendiendo un fondo no te sube el tipo de tu nómina, ni al revés. Son dos cuentas separadas que se pagan en la misma declaración.

## Lo que casi nadie tiene en cuenta: se acumula

La escala se aplica al **total del año**, no a cada operación. Si en marzo realizas 5.000 € de ganancia y en noviembre otros 5.000, la segunda venta no empieza otra vez por el 19 %: entra donde lo dejó la primera. Muévelo y verás el escalón:

<Mando
	etiqueta="Ganancia realizada en el año"
	min={2000}
	max={80000}
	paso={2000}
	inicial={8000}
	unidad=" €"
	etiquetaResultado="Lo que pagas por ella"
	calcular={(g) => `${Math.round(calculateSavingsTax(g)).toLocaleString('es-ES', { useGrouping: 'always' })} €`}
	nota="Calculado con la misma función que usa el panel fiscal de la app, sobre la escala vigente. Divide el resultado entre la ganancia y tendrás tu tipo efectivo."
/>

De ahí sale la palanca que se usa de verdad: **partir una venta grande entre dos ejercicios** puede dejar cada mitad en un tramo más bajo. No siempre compensa —depende de qué esperes ganar el año que viene— pero es gratis y es tuya.

<div class="bloque aviso">

## Lo que no te van a contar

**Los dividendos comparten base con las ganancias.** Suman a la misma escala, así que un año con muchos dividendos deja tus ventas en un tramo más alto. Es una de las razones de la lección 6.

**Y los intereses de depósitos y letras también.** Si tienes la parte conservadora en letras del Tesoro, ese rendimiento ya está empujando tu escala hacia arriba antes de que vendas nada.

**Lo que no está aquí es el patrimonio en sí.** Pagar por tener no es lo mismo que pagar por vender: son impuestos distintos, con normativa autonómica. Este curso va del segundo.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Tu cartera tributa en la base del ahorro, separada de tu nómina.
- La escala es progresiva por tramos: entrar en uno no reprecia lo anterior.
- Se acumula por año, no por operación. Partir una venta entre ejercicios es una palanca real.
- Dividendos e intereses ocupan sitio en esa misma escala.

</div>
