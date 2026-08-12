---
titulo: "Cuándo tu cartera «diversificada» no lo está"
descripcion: "Las cuatro concentraciones que no aparecen en ningún reparto por región, cómo detectarlas y qué hacer cuando las encuentras."
orden: 6
gancho: "Puedes tener mil cuatrocientas empresas y seguir apostando por veinte. Diversificar no es contar líneas."
minutos: 8
arquetipo: decidir
accion:
  texto: "Última vez: mira el mapa completo. Solapamiento, región y sector en la misma pantalla. Si al terminar el curso hay algo que te sorprende, ese es el valor de todo esto."
  cta: "Ver el mapa completo"
  href: "/"
lecturas:
  - texto: "La cartera Bogle para principiantes en España"
    href: "/blog/cartera-bogle-principiantes-espana"
  - texto: "Qué es el asset allocation"
    href: "/blog/que-es-asset-allocation"
  - texto: "Alternativas a Portfolio Performance"
    href: "/blog/alternativas-portfolio-performance"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Cierre del curso. ¿De cuántas formas se puede estar concentrado sin que se note?

<Pasos
	titulo="Las cuatro concentraciones"
	pasos={[
		{
			titulo: 'Por empresa',
			detalle: 'Un índice ponderado por capitalización pone arriba a las que más valen, y las diez primeras son una fracción del total mucho mayor de lo que sugiere «1.400 empresas». Tener mil cuatrocientas no es estar repartido entre mil cuatrocientas.'
		},
		{
			titulo: 'Por sector',
			detalle: 'Consecuencia de la anterior: si las mayores empresas del mundo pertenecen al mismo sector, tu índice global es en buena parte una apuesta sectorial que no elegiste.'
		},
		{
			titulo: 'Por producto duplicado',
			detalle: 'La de la primera lección. Tres fondos que son las mismas empresas con distinto peso, y se detecta con el solapamiento, no con los nombres.'
		},
		{
			titulo: 'Fuera de la cartera',
			detalle: 'Tu empleo, tu vivienda y tu país. Si trabajas en tecnología y tu cartera está muy expuesta a tecnología, una crisis del sector te toca el sueldo y el patrimonio a la vez.',
			aviso: 'Esta no sale en ninguna herramienta, incluida esta. Sumarla a mano, una sola vez, cambia bastante la foto — y suele ser la más grande de las cuatro.'
		}
	]}
/>

<Comprueba
	pregunta="Encuentras que tu cartera tiene un 30 % en tecnología. ¿Qué haces?"
	opciones={[
		{
			texto: 'Vender parte y repartirlo entre otros sectores',
			correcta: false,
			porque: 'Deshacer posiciones cuesta impuestos y comisiones, y además estarías apostando activamente contra la capitalización de mercado — que es una decisión legítima, pero es una apuesta y hay que saber que la estás haciendo.'
		},
		{
			texto: 'Comprobar primero si esa exposición la elegiste, y corregir con lo nuevo si no',
			correcta: true,
			porque: 'Ese es el orden. Si la elegiste, no hay nada que arreglar. Si no, redirigir aportaciones no cuesta impuestos y deshacer sí — y solo si es grande y no la elegiste tiene sentido plantear un cambio estructural, que ya no es rebalancear sino cambiar el reparto.'
		},
		{
			texto: 'Nada: en un índice global lo que hay es lo que hay',
			correcta: false,
			porque: 'Es casi la respuesta correcta y le falta la primera mitad. «Lo que hay es lo que hay» vale cuando lo has mirado y lo aceptas; dicho sin mirar es la frase que ha tapado todas las concentraciones de este curso.'
		}
	]}
/>

## Cómo se mide la primera, que es la que menos se mira

La concentración por empresa no aparece en ningún reparto por región ni por sector, así que hay que buscarla a propósito. La ficha oficial de cualquier índice publica el peso de sus diez mayores posiciones, y ese único número dice más sobre tu riesgo real que la cifra de empresas totales: si las diez primeras son una quinta parte del fondo, tienes mil cuatrocientas empresas y una apuesta; si son una vigésima, tienes mil cuatrocientas empresas.

## ¿Y por qué ha crecido tanto sin que nadie lo decidiera?

Por el mecanismo de siempre: las empresas que más suben pesan más, y al pesar más arrastran al índice. Es exactamente lo que un índice ponderado por capitalización debe hacer, así que no es un fallo del producto ni algo que su gestora pueda corregir — y tampoco algo de lo que vayas a enterarte, porque el fondo se sigue llamando igual y su ficha sigue diciendo mil cuatrocientas empresas.

Lo útil es mirar ese número una vez al año, el mismo día que revisas la cartera, y compararlo con el del año anterior. Si sube mucho y sostenidamente, tu fondo global se parece cada vez más a una apuesta sectorial concentrada. Eso puede seguir estando perfectamente bien, siempre que sea una frase que puedas decir en voz alta sobre tu propia cartera sin que te suene rara.

## Por qué esto cierra los cinco cursos

Porque las cuatro concentraciones tienen algo en común: ninguna se ve en la lista de fondos, que es lo único que casi todo el mundo mira. Se ven mirando dentro y midiendo el tiempo, que es lo que estos cinco cursos han intentado enseñar a hacer.

Y conviene terminar con el límite de todo esto, porque es real: diversificar tiene un punto a partir del cual añadir no reduce riesgo, solo añade productos que seguir. La diferencia entre 1.400 empresas y 3.000 es mucho menor que la diferencia entre 20 y 200.

<div class="bloque aviso">

## Lo que no te van a contar

**Hay un riesgo que no se diversifica de ninguna manera**: el de mercado. Cuando cae todo, cae todo. La diversificación protege del riesgo específico —que una empresa o un sector lo hagan mal— y de eso protege muy bien, hasta el punto de que es casi el único almuerzo gratis que existe aquí. De lo otro no protege nadie, y quien te diga lo contrario está vendiendo algo.

**Y la concentración por empresa ha crecido mucho en la última década** sin que nadie tomara ninguna decisión. Es el mismo mecanismo de siempre: la capitalización decide, y tú te enteras si miras.

</div>

## Ya está

Con el curso hecho tienes el mapa de lo que hay dentro de tus fondos, tu exposición real por región y sector, y la diferencia entre lo que rindió tu cartera y lo que rendiste tú.

Y una idea que cierra los cinco cursos: **casi todo lo que importa en una cartera indexada no se ve mirando la lista de fondos.** Se ve mirando dentro, y midiendo el tiempo.

<div class="bloque retener">

## Lo que hay que retener

- Contar empresas no es diversificar: mira el peso de las diez primeras.
- Sector y región son consecuencias de la capitalización, no decisiones.
- Tu empleo, tu vivienda y tu país son parte de tu concentración real.
- Corrige con las aportaciones nuevas antes que deshaciendo lo viejo.

</div>
