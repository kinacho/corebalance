---
titulo: "Sesgo local, small caps y value: cuándo suman y cuándo son ruido caro"
descripcion: "Los tres añadidos más frecuentes a una cartera indexada global, qué argumento tiene cada uno y cómo saber si te están aportando algo."
orden: 4
gancho: "Todos estos añadidos tienen un buen argumento académico. El problema es el plazo en el que hay que sostenerlo."
minutos: 8
arquetipo: decidir
accion:
  texto: "Añade el fondo que estás considerando a la cartera de ejemplo y mira el solapamiento y el reparto por sector. Si tu exposición apenas se mueve, el añadido es coste sin efecto."
  cta: "Comprobar si añade algo"
  href: "/"
lecturas:
  - texto: "Fondos indexados vs ETFs en España"
    href: "/blog/fondos-indexados-vs-etfs-espana"
  - texto: "La cartera MSCI World + Emerging Markets"
    href: "/blog/cartera-msci-world-emerging-markets"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Mando from '$lib/components/cursos/Mando.svelte';
</script>

Un fondo global ya es una cartera terminada. ¿Qué tiene que demostrar cualquier cosa que le añadas encima?

Esto, antes que ningún argumento: **cuánto mueve tu exposición real**. Mueve el peso que le darías al añadido y míralo.

<Mando
	etiqueta="Peso del fondo que añades"
	min={1}
	max={20}
	paso={1}
	inicial={5}
	unidad=" %"
	etiquetaResultado="Lo que se mueve tu exposición real"
	calcular={(peso) => `${(peso * 0.2).toLocaleString('es-ES', { maximumFractionDigits: 1 })} puntos`}
	nota="Supone que el 80 % de lo que lleva ese fondo ya está dentro de tu global, que es lo habitual en un añadido sectorial o factorial. Con menos solapamiento mueve más — pero eso se mide, no se estima."
/>

Un producto más que seguir, una orden más que dar y un TER más que pagar, para mover un punto. Con eso en la cabeza, los tres candidatos habituales.

<Comprueba
	pregunta="De los tres añadidos clásicos —sesgo local, small caps y value—, ¿cuál es el problema que comparten?"
	pista="No es que el argumento sea malo. Los tres tienen uno bueno."
	opciones={[
		{
			texto: 'Que no están respaldados por la evidencia',
			correcta: false,
			porque: 'Lo están, y value es probablemente el más sólido académicamente de los tres. Si el problema fuera ese, la decisión sería fácil.'
		},
		{
			texto: 'Que hay que sostenerlos durante décadas, incluidos quince años en contra',
			correcta: true,
			porque: 'Las primas por factores se miden en plazos larguísimos y tienen periodos larguísimos en contra. Si te vas a cansar antes —y casi todo el mundo se cansa—, has pagado el coste sin cobrar el premio.'
		},
		{
			texto: 'Que en España no hay productos para implementarlos',
			correcta: false,
			porque: 'Haberlos hay, aunque son más caros y menos puros de lo que suenan. Es un problema real, pero de segundo orden frente al del plazo.'
		}
	]}
/>

## ¿Cuánto sesgo local es defendible?

Darle a Europa —o a España— más peso del que le toca por capitalización. A favor: tus gastos futuros son en euros, y una cartera con dos tercios en dólares arrastra un riesgo de divisa que no aparece en ninguna ficha; acercar la moneda de tus activos a la de tus gastos lo reduce de verdad. En contra, el argumento que se oye más: «conozco estas empresas». No las conoces, conoces sus anuncios.

Algo de sobreponderación europea es defendible. El IBEX como posición propia es otra cosa: 35 valores, muy concentrados en banca y utilities, con un histórico que no acompaña.

## Small caps y value

**Small caps** completa una cobertura que de verdad te falta, porque un MSCI World solo lleva grandes y medianas: añadirlas es tapar un agujero real del índice. El argumento malo es esperar que la prima aparezca justo en tu ventana de veinte años.

**Value** es el más sólido sobre el papel y el que más ha sufrido en la última década antes de recuperar. Su argumento malo es el peor de los tres: entrar después de leer que «value vuelve» es cambiar de estrategia con el periódico delante, que es exactamente lo que la indexación existe para evitar.

<div class="bloque aviso">

## Lo que no te van a contar

**Cada añadido tiene un coste que nadie apunta: la probabilidad de que abandones.** Una cartera de dos fondos se mantiene sola quince años; una de seis pide decisiones, y cada decisión es una oportunidad de equivocarse.

**Los fondos factoriales disponibles aquí son más caros y menos puros de lo que suenan.** El TER sube, la replicación es peor y la definición de «value» varía entre proveedores: parte de la prima teórica se queda en el camino.

**Y el sesgo local ya lo tienes sin quererlo**: cobras en euros, tu vivienda está aquí y tu empleo depende de esta economía.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Los tres tienen argumento; el problema es sostenerlo décadas.
- Algo de Europa es defendible. El IBEX como posición propia, mucho menos.
- Antes de añadir, mide cuánto mueve tu exposición. Si es un punto, no lo añadas.
- Cada producto extra sube la probabilidad de que abandones la estrategia.

</div>
