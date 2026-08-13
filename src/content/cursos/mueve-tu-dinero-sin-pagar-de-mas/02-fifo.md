---
titulo: "FIFO: no eliges tú qué participaciones vendes"
descripcion: "Por qué Hacienda te obliga a vender primero las más antiguas, en qué se diferencia del coste medio que ves en tu bróker y qué consecuencias tiene al rebalancear."
orden: 2
gancho: "Tu bróker te enseña un coste medio. Hacienda no usa el coste medio. Las dos cifras son correctas y sirven para cosas distintas."
minutos: 8
arquetipo: desmontar
accion:
  texto: "Con tus operaciones importadas, el panel fiscal aplica FIFO sobre ellas y te dice qué ganancia realizarías al vender. Compáralo con el coste medio que muestra la ficha del activo: la diferencia es exactamente lo que explica esta lección."
  cta: "Ver mi FIFO real"
  href: "/dashboard"
lecturas:
  - texto: "Importar movimientos de MyInvestor (el libro de operaciones que hace falta)"
    href: "/blog/importar-movimientos-myinvestor"
  - texto: "Importar el CSV de DeGiro"
    href: "/blog/importar-csv-degiro"
fuentes:
  - texto: "Ley 35/2006 del IRPF, art. 37.2 — valores homogéneos"
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Compraste el mismo fondo cinco veces, a cinco precios distintos. Vendes una parte: ¿cuál has vendido?

Da igual lo que pongas en la orden. No lo decides tú.

<Comprueba
	pregunta="Llevas cinco años aportando al mismo fondo y vendes el 10 % de la posición. ¿Qué ganancia realizas?"
	opciones={[
		{
			texto: 'El 10 % de mi ganancia total: vendo un trozo proporcional',
			correcta: false,
			porque: 'Es lo que sugiere el coste medio que te enseña el bróker, y por eso casi todo el mundo calcula así. Pero el coste medio no es la cifra fiscal.'
		},
		{
			texto: 'Más de lo proporcional, porque salen primero las participaciones más antiguas',
			correcta: true,
			porque: 'Las más viejas son las que más han subido, así que son las que más plusvalía llevan encima. La ganancia fiscal de una venta parcial es mayor —a veces bastante mayor— de lo que sugiere el coste medio.'
		},
		{
			texto: 'Lo que yo decida: puedo indicar qué participaciones vendo',
			correcta: false,
			porque: 'En otros países sí, y de ahí vienen la mitad de los consejos sobre tax loss harvesting que leerás en inglés. Aquí no existe la elección de lotes: da la orden que quieras, FIFO se aplica igual.'
		}
	]}
/>

## La regla, y que es obligatoria

Para valores homogéneos, el artículo 37.2 de la Ley del IRPF establece que **se consideran transmitidas las adquiridas en primer lugar**. Primero en entrar, primero en salir: no es una convención contable que puedas cambiar.

## ¿Por qué importa tanto el orden?

Porque en una cartera que lleva años aportando, las participaciones más antiguas son las que más han subido. Vender «un poco» de una posición vieja realiza la parte más cargada de plusvalía que tienes, no un trozo medio de ella.

<Pasos
	titulo="El mismo caso, con números"
	pasos={[
		{
			titulo: 'Cinco compras de 1.000 € cada una',
			detalle: 'La primera a 10 € por participación, la última a 25 €. En total 5.000 € invertidos y 320 participaciones.'
		},
		{
			titulo: 'Hoy la participación vale 30 €',
			detalle: 'La posición vale 9.600 €, con 4.600 € de ganancia latente. Tu coste medio es de 15,6 € por participación.'
		},
		{
			titulo: 'Vendes 100 participaciones, 3.000 €',
			detalle: 'Por coste medio parecería una ganancia de unos 1.440 €. Por FIFO salen las de 10 € y las de 12,5 €: la ganancia real ronda los 1.900 €.',
			aviso: 'Un tercio más de base imponible que la cuenta intuitiva, en un ejemplo deliberadamente suave. Con quince años de aportaciones la distancia crece.'
		}
	]}
/>

## Las dos cifras, y por qué conviven

Tu bróker, tu hoja de cálculo y esta misma herramienta te enseñan un **coste medio ponderado**. Es la cifra correcta para saber cómo va tu inversión, porque responde a «¿cuánto he puesto por participación?», que es lo que quieres saber el 99 % de los días. Pero no es la cifra fiscal: para calcular lo que pagas hace falta FIFO, que necesita las fechas y los importes de cada compra y no un promedio de todas ellas.

⚠️ Esta app mantiene las dos a propósito y no las mezcla: el coste medio en la ficha del activo, FIFO en el panel fiscal. Si alguna vez ves que coinciden, es porque solo has comprado una vez.

## ¿Qué hace falta para calcular el tuyo?

Fechas. **Sin el libro de operaciones no hay FIFO**, y sin FIFO cualquier estimación fiscal es eso, una estimación. Importar el CSV del bróker no es una comodidad — es lo que convierte «creo que gano unos 4.000 €» en un número con el que se puede decidir.

<div class="bloque aviso">

## Lo que no te van a contar

**FIFO también tiene su lado bueno.** Las participaciones más antiguas son las que llevan más tiempo compuesto: venderlas primero es malo fiscalmente, pero significa que estás realizando la parte que más ha trabajado.

**Y ojo con «vender solo las últimas».** Es un plan que no existe. Si alguien te lo propone como estrategia, no ha leído el artículo.

</div>

<div class="bloque retener">

## Lo que hay que retener

- FIFO es obligatorio: se venden primero las participaciones más antiguas.
- Las más antiguas son las que más han subido, así que la ganancia fiscal supera lo que sugiere el coste medio.
- Coste medio y FIFO son dos cifras correctas para dos preguntas distintas.
- Sin fechas de compra no hay FIFO, y sin FIFO no hay cálculo fiscal.

</div>
