---
titulo: "La divisa: el riesgo que no sale en ningún folleto"
descripcion: "Por qué la moneda en que cotiza tu fondo no importa, por qué la de sus empresas sí, y qué hace realmente un fondo con cobertura de divisa."
orden: 3
gancho: "Que tu fondo cotice en euros no significa que tu dinero esté en euros. Es la confusión más extendida de todas."
minutos: 8
arquetipo: dato
accion:
  texto: "Mira tu reparto por región. La divisa a la que estás expuesto sigue de cerca ese mapa: si tienes un 60 % en Estados Unidos, tienes en torno a un 60 % de exposición al dólar, cotice tu fondo en lo que cotice."
  cta: "Ver mi reparto por región"
  href: "/dashboard"
lecturas:
  - texto: "Fondos indexados vs ETFs en España"
    href: "/blog/fondos-indexados-vs-etfs-espana"
  - texto: "IWDA vs VWCE: divisa y clases"
    href: "/blog/iwda-vs-vwce-comparativa"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Compras un fondo global en euros, desde España, con una cuenta en euros. ¿Tienes riesgo de divisa?

<Comprueba
	pregunta="Dos clases del mismo fondo global: una cotiza en euros y otra en dólares. Para ti, que inviertes desde España, ¿en qué se diferencian?"
	opciones={[
		{
			texto: 'La de euros me quita el riesgo de tipo de cambio',
			correcta: false,
			porque: 'Es la confusión más extendida de toda la inversión indexada. La moneda de cotización es una etiqueta contable: alguien hace la conversión antes de enseñarte el número, y el riesgo sigue ahí entero.'
		},
		{
			texto: 'En casi nada: rinden prácticamente lo mismo',
			correcta: true,
			porque: 'Lo que determina tu exposición es la moneda en que están denominados los activos de dentro. Si el fondo tiene un 60 % en empresas estadounidenses, ese 60 % está en dólares, se exprese la clase como se exprese.'
		},
		{
			texto: 'La de dólares tiene más riesgo porque yo cobro en euros',
			correcta: false,
			porque: 'Suena lógico y no lo es, por el mismo motivo: el riesgo no lo trae la etiqueta de la clase, lo traen las empresas. Las dos clases lo tienen idéntico.'
		}
	]}
/>

## Qué significa esto en la práctica

Si el euro se aprecia un 10 % frente al dólar y tus empresas estadounidenses no se mueven, tu cartera pierde en torno a un 6 % medida en euros. No ha pasado nada en las empresas: ha pasado en el par de divisas, y tú lo ves como si hubiera pasado en la bolsa.

Va en las dos direcciones, claro, y a lo largo de décadas tiende a compensarse. Pero «décadas» es bastante más tiempo del que la mayoría tiene en la cabeza cuando abre la cartera un martes y la ve un 6 % abajo sin ninguna noticia que lo explique. Saber que ese movimiento existe y de dónde viene es la mitad de no reaccionar a él.

## ¿Y los fondos con cobertura?

Existen clases *hedged*, que cubren el riesgo de divisa con derivados. Antes de usarlas conviene saber tres cosas:

<Pasos
	titulo="Lo que hay que saber antes de cubrir"
	pasos={[
		{
			titulo: 'Cuesta, y no aparece en el TER',
			detalle: 'El coste depende del diferencial de tipos entre las dos monedas, y en algunos periodos ha sido significativo.'
		},
		{
			titulo: 'Renuncias también al lado bueno',
			detalle: 'No estás quitando un riesgo: estás cambiando dos colas por ninguna. Si el dólar se aprecia, tú no lo cobras.'
		},
		{
			titulo: 'Para bolsa a largo plazo rara vez compensa; para renta fija a corto, sí',
			detalle: 'En renta fija la divisa puede dominar por completo el rendimiento del activo, así que cubrir tiene mucho más sentido ahí.',
			aviso: 'Este es el matiz que se pierde en los foros, donde «hedged sí o no» se discute como si fuera una sola pregunta para toda la cartera.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**Tu exposición a divisa cambia sola.** No es un parámetro que fijes: sube y baja con la composición del índice, y nadie te avisa cuando pasas del 55 % al 62 % en dólares.

**Y tienes menos riesgo del que parece**, porque tus gastos futuros no son solo en euros. Si compras tecnología, energía o viajes, parte de tu coste de vida ya está indexado al dólar. La cobertura perfecta no es «todo en euros»: es que la moneda de tus activos se parezca a la de tus gastos.

**Ninguna herramienta de cartera española te enseña esta exposición**, ni siquiera esta: lo que se enseña aquí es el reparto por región, del que la divisa se deduce bastante bien. Decirlo es más honesto que dibujar una tarta de monedas basada en la misma estimación.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La moneda de cotización es una etiqueta. Lo que cuenta es dónde están los activos.
- Un 60 % en EE. UU. es aproximadamente un 60 % de exposición al dólar.
- Cubrir tiene coste y renuncia al lado bueno. Para bolsa a largo, rara vez compensa.
- Tus gastos futuros tampoco son 100 % euros.

</div>
