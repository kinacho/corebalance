---
titulo: "Lo que de verdad pagas (y no es solo el TER)"
descripcion: "TER, tracking difference, custodia, compraventa y cambio de divisa. Los cuatro costes que no salen en la ficha y cómo calcular el tuyo real."
orden: 3
gancho: "Hay gente peleando por 0,05 % de TER mientras paga un 0,30 % en cambio de divisa sin enterarse."
minutos: 8
arquetipo: dato
accion:
  texto: "Mete los fondos que estás mirando con su TER y su peso. La calculadora te da el coste ponderado de la cartera entera y lo proyecta a veinte años."
  cta: "Calcular mi coste real"
  href: "/herramientas/calculadora-ter"
lecturas:
  - texto: "Fondos indexados vs ETFs en España: costes comparados"
    href: "/blog/fondos-indexados-vs-etfs-espana"
  - texto: "Dividendos de ETFs en DeGiro: retenciones y cómo declararlos"
    href: "/blog/dividendos-etfs-degiro"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
  import { TER_INDEXADOS } from '$lib/cursos-datos';
</script>

Si el TER de un indexado ya está entre los más bajos del mercado, ¿de dónde sale el resto de lo que pagas?

Esta es la banda real de gasto corriente de los fondos indexados contratables hoy desde España, leída ficha a ficha en su DFI:

<Cifras fuente={TER_INDEXADOS.procedencia.fuente} fecha={TER_INDEXADOS.procedencia.fecha}>
	<Cifra valor={TER_INDEXADOS.minimo.toLocaleString('es-ES')} unidad=" %" etiqueta="El más barato de los comprobados" />
	<Cifra valor={TER_INDEXADOS.maximo.toLocaleString('es-ES')} unidad=" %" etiqueta="El más caro de los comprobados" matiz="La diferencia entre los dos extremos es de trece céntimos por cada 100 € al año." />
</Cifras>

Trece céntimos. Ahí está peleando media internet, y en muchas carteras el TER es menos de la mitad de lo que se paga.

<Comprueba
	pregunta="Compras un fondo que replica el S&P 500 con un TER del 0,15 %. Al cabo de un año, el índice ha subido un 10 %. ¿Cuánto ha subido tu fondo?"
	pista="La respuesta no es «un 9,85 %», y ahí está la lección."
	opciones={[
		{
			texto: 'Un 9,85 % exacto: el índice menos el TER',
			correcta: false,
			porque: 'Es la cuenta que todo el mundo hace y la que ninguna ficha confirma. El TER es lo que el fondo se cobra, no todo lo que le cuesta replicar el índice.'
		},
		{
			texto: 'Algo distinto del 9,85 %, y puede ser por arriba o por abajo',
			correcta: true,
			porque: 'A la diferencia real entre el índice y el fondo se le llama tracking difference, y además del TER incluye impuestos internos sobre dividendos, coste de las operaciones y el préstamo de valores. Algunos fondos acaban por encima de lo que su TER haría esperar.'
		},
		{
			texto: 'Un 10 %, porque el TER lo paga la gestora aparte',
			correcta: false,
			porque: 'No te llega ningún recibo, pero lo pagas: se descuenta del valor liquidativo día a día. Que no se vea es justo lo que lo hace fácil de ignorar.'
		}
	]}
/>

## Los cuatro costes, de más visible a más escondido

**El TER** es lo que el fondo se cobra a sí mismo cada año: gestión, depositaría, auditoría. Es el que mejor conoces y sobre el que más control tienes.

**La tracking difference** es lo que acabas de ver: la distancia real entre lo que hizo el índice y lo que hizo tu fondo, después de todo. Dos fondos con el mismo TER pueden tenerla distinta, y está en el informe anual del fondo, no en el anuncio. Es la que de verdad mide si el fondo hace bien su trabajo, y es la que casi nadie mira porque exige buscarla.

**La custodia** es lo que te cobra quien te guarda las posiciones. Muchos comercializadores de fondos no cobran nada; algunos brókeres de ETFs cobran una comisión anual, a veces con mínimos. Es pequeña, pero se paga sobre el saldo, igual que el TER, así que compone igual de mal.

## ¿Cuál es el cuarto coste, el que depende de ti?

Los tres anteriores se pagan sobre el saldo. Los de operar se pagan **por operación**, y eso cambia por completo quién los sufre: la misma tarifa es barata o cara según cada cuánto aportes tú.

<Mando
	etiqueta="Cuánto aportas cada vez"
	min={50}
	max={1000}
	paso={25}
	inicial={150}
	unidad=" €"
	etiquetaResultado="Lo que se lleva una comisión de 1 € por operación"
	calcular={(importe) => `${((1 / importe) * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`}
	nota="Solo la comisión de compra. Si el producto cotiza en otra divisa, el cambio de moneda suma entre un 0,10 % y un 0,50 % más, y casi nunca aparece como una línea aparte: va metido en el tipo aplicado."
/>

⚠️ Ahí está el error que da título a la lección: elegir el fondo con 0,05 % menos de TER y pagar un 0,30 % de divisa doce veces al año.

<div class="bloque aviso">

## Lo que no te van a contar

**Un TER más bajo no es siempre un fondo mejor.** Si su tracking difference es peor, te está costando más de lo que dice. Compara resultado contra índice, no folletos.

**El gasto corriente cambia de una clase a otra del mismo fondo**, así que un dato sin la clase y el ISIN no es comprobable. Es la primera advertencia del propio conjunto de datos de arriba, y la razón de que cada fila lleve la fecha de su DFI.

**Y hay un coste que no está en ninguna tabla**: el fiscal. Vender un ETF para cambiar a otro puede superar diez años de diferencia de TER, y se paga de golpe.

</div>

<div class="bloque retener">

## Lo que hay que retener

- El TER es lo que el fondo cobra; la **tracking difference** es lo que de verdad te costó.
- Custodia y TER componen sobre el saldo. Compraventa y divisa se pagan por operación.
- El coste de operar depende de **cómo aportas tú**, no de la tarifa.
- Antes de optimizar céntimos de TER, mira si estás pagando divisa.

</div>
