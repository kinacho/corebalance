---
titulo: "Lo que te ha costado el timing"
descripcion: "Cómo leer la diferencia entre tus dos rentabilidades sin sacar la conclusión equivocada, y qué se puede hacer con ese número."
orden: 5
gancho: "Es el número más incómodo de la app, y también el que menos culpa reparte de lo que parece."
minutos: 7
arquetipo: calcular
accion:
  texto: "Mira tu coste de timing sobre el periodo medido. Si tu cartera no tiene aportaciones ni ventas en ese tramo, el panel te lo dirá en vez de inventarse una comparación."
  cta: "Ver mi coste de timing"
  href: "/"
lecturas:
  - texto: "Cuándo rebalancear la cartera"
    href: "/blog/cuando-rebalancear-cartera"
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
</script>

Ya tienes tus dos rentabilidades. ¿Cuánto de la diferencia entre ellas es culpa tuya?

Menos de lo que parece. Estos dos casos son el mismo activo y las mismas fechas de mercado, cambiando solo el mes en que entró el dinero:

<Cifras fuente="Ejemplo calculado sobre una serie real de mercado" fecha="Mismo activo, distinto mes de aportación">
	<Cifra
		valor="−5,57"
		unidad=" pp"
		etiqueta="Aportando después de un tramo bueno y antes de uno malo"
		tono="mal"
	/>
	<Cifra
		valor="+6,42"
		unidad=" pp"
		etiqueta="Aportando después de una caída"
		tono="bien"
	/>
</Cifras>

<Comprueba
	pregunta="Tu coste de timing sale en −3 puntos. Aportas 400 € automáticos el día 1 de cada mes y no has hecho nada más. ¿Qué te dice ese número sobre ti?"
	opciones={[
		{
			texto: 'Que estoy eligiendo mal los momentos de entrada',
			correcta: false,
			porque: 'No estás eligiendo ningún momento: aportas el día 1 pase lo que pase. Si tu timing es el calendario, el número habla del calendario, no de ti.'
		},
		{
			texto: 'Nada: al calendario le tocaron meses malos',
			correcta: true,
			porque: 'Es exactamente eso, y por eso conviene no leerlo como una nota. Un coste negativo con aportación automática significa que el mercado bajó después de tus fechas, que no era información disponible cuando aportaste.'
		},
		{
			texto: 'Que debería esperar a mejores momentos para aportar',
			correcta: false,
			porque: 'Es la conclusión contraria a la correcta, y la más cara de todas: quien intenta acertar el momento suele hacerlo peor que el calendario. El número describe el pasado; usarlo para predecir es justo el error que mide.'
		}
	]}
/>

## ¿Cómo hay que leerlo, entonces?

Como un diagnóstico de **comportamiento**, y solo si es grande y persistente. Si tu MWR está sistemáticamente por debajo y sabes que has metido dinero extra en subidas y frenado en caídas, eso sí es una conducta corregible — y la corrección no es acertar mejor, es automatizar y dejar de decidir. Si es pequeño o cambia de signo entre periodos, es ruido de calendario y hay que ignorarlo.

Fíjate también en contra qué compara: no contra lo óptimo, sino contra un mundo en el que tu dinero hubiera estado siempre invertido en la misma proporción, que no era una opción disponible. Nadie tenía el dinero desde el principio; lo fue teniendo.

## La única acción que se sigue

Automatizar la aportación y no tocarla. Es aburrido y es lo que funciona. Y si te sobra dinero en un momento dado, la evidencia dice que meterlo de golpe gana más veces que repartirlo, aunque repartirlo sea más fácil de sostener — la misma discusión del primer curso, que sigue sin tener una respuesta única.

<div class="bloque aviso">

## Lo que no te van a contar

**Este panel se apaga si no has movido dinero**, y eso es correcto: sin aportaciones ni ventas no hay timing que medir y las dos cifras coinciden. Una herramienta que enseñara un «coste de timing» del 0,3 % en esa situación estaría enseñando ruido numérico con cara de dato.

**Casi ninguna herramienta lo calcula**, porque requiere el libro de operaciones completo y porque el número incomoda. Es de las pocas cifras de una cartera que hablan del inversor y no del mercado.

**Y el mayor coste de timing no aparece aquí**: el del dinero que nunca llegó a entrar. Los meses que decidiste esperar «a que se aclare» no dejan rastro en ninguna métrica, porque no hay operación que medir.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Es la distancia entre lo que rindieron tus activos y lo que rendiste tú.
- No es una nota de comportamiento salvo que sea grande y persistente.
- La única acción que se sigue es automatizar y dejar de decidir.
- El coste del dinero que nunca entró no lo mide nadie, y suele ser el mayor.

</div>
