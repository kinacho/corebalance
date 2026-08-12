---
titulo: "Cuánto tiempo llevas descuadrado"
descripcion: "La pregunta que ninguna otra herramienta contesta: no dónde estás hoy, sino cuánto tiempo llevas fuera de tu banda y si los rebalanceos que hiciste sirvieron de algo."
orden: 4
gancho: "Saber que hoy estás a 6 puntos no dice nada. Saber que llevas ocho meses a más de 5 lo dice todo."
minutos: 7
arquetipo: desmontar
accion:
  texto: "Abre el gráfico de deriva: dibuja, día a día, a qué distancia de su objetivo ha estado cada activo. Si has rebalanceado alguna vez, se ve exactamente si funcionó o si volviste a salirte a las dos semanas."
  cta: "Ver mi histórico de deriva"
  href: "/"
lecturas:
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
  - texto: "Importar el CSV de Interactive Brokers (el histórico que hace falta)"
    href: "/blog/importar-csv-interactive-brokers"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Todas las herramientas de cartera contestan «¿cómo estoy hoy?». ¿Qué te estás perdiendo con esa foto?

<Comprueba
	pregunta="Dos carteras están hoy exactamente a 6 puntos de su objetivo. ¿Están igual de mal?"
	opciones={[
		{
			texto: 'Sí: la desviación es la misma, el riesgo es el mismo',
			correcta: false,
			porque: 'El riesgo de hoy sí es el mismo. Lo que no es igual es lo que ha pasado hasta hoy, y eso es lo que dice si tu sistema funciona o si llevas meses sin enterarte.'
		},
		{
			texto: 'No, si una lleva una semana así y la otra ocho meses',
			correcta: true,
			porque: 'Salirse un mes por una racha es ruido, y es exactamente el caso para el que existe la banda. Llevar ocho meses fuera significa otra cosa: o no la revisas, o es demasiado estrecha para lo que estás dispuesto a hacer.'
		},
		{
			texto: 'No, porque depende de qué activo se haya desviado',
			correcta: false,
			porque: 'Influye, pero mucho menos de lo que parece: la banda es absoluta precisamente para tratar igual una desviación de 6 puntos venga de donde venga. Lo que de verdad cambia el diagnóstico es el tiempo.'
		}
	]}
/>

## ¿Qué preguntas solo contesta el histórico?

**¿Es la primera vez que me salgo, o llevo así medio año?** **¿Los rebalanceos que hice sirvieron?** — si cada vez que ajustas vuelves a salirte en tres semanas, no estás rebalanceando: estás persiguiendo el mercado con comisiones. Y **¿cuánto riesgo he tenido de más, y durante cuánto?**, porque un 93,6 % en bolsa durante dos meses es una cosa y durante seis años es otra muy distinta.

Ninguna de las tres se responde con la foto de hoy, y las tres cambian lo que deberías hacer. Es la diferencia entre saber tu temperatura y tener la gráfica de la fiebre.

## Lo que dibuja el gráfico

Para cada activo con objetivo, la distancia en puntos porcentuales a ese objetivo, cada día, con la banda dibujada como una zona y no como dos líneas: lo que quieres leer es si estás dentro, no cruzar números.

⚠️ Y una decisión que importa: **la deriva se mide dentro del bloque, nunca sobre el patrimonio total.** Tus objetivos son pesos dentro de tu cartera principal; si tus acciones individuales suben mucho, esa cartera pesa menos sobre el total sin que nada dentro de ella se haya desviado. Medirlo sobre el total inventaría una desviación cada vez que se mueve algo que no tiene objetivo.

<Pasos
	titulo="Las tres formas que puede tener tu gráfico"
	pasos={[
		{
			titulo: 'Picos cortos que vuelven solos',
			detalle: 'No hagas nada. Es exactamente el caso para el que existe la banda, y actuar aquí es el error de operar de más.'
		},
		{
			titulo: 'Meseta larga fuera de banda',
			detalle: 'Revisa con qué frecuencia miras, o ensancha la banda a un número que sí vayas a cumplir.',
			aviso: 'Una banda incumplida es peor que una banda ancha: da la sensación de tener un sistema sin tener ninguno.'
		},
		{
			titulo: 'Sierra: dentro, fuera, dentro, fuera',
			detalle: 'Tu banda es demasiado estrecha para la volatilidad de esa posición. Cada diente es una operación que pagaste para nada.'
		}
	]}
/>

<div class="bloque aviso">

## Lo que no te van a contar

**Esto necesita histórico, y el histórico necesita tu libro de operaciones.** Sin las fechas de tus compras no se puede reconstruir cuántas participaciones tenías cada día, y el gráfico dibuja una estimación en vez de un dato.

**Ni Ghostfolio ni Portfolio Performance lo enseñan**, y no por descuido: enseñan cuánto tienes y cuánto ha rendido porque no son herramientas de rebalanceo. La pregunta «cuánto llevo descuadrado» solo se le ocurre a quien tiene un objetivo escrito.

**Y una cartera bien ajustada da un gráfico aburridísimo**, pegado al cero. Eso es lo que quieres ver: si tu gráfico es emocionante, algo va mal.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La desviación de hoy dice si actuar; el histórico dice si tu sistema funciona.
- Picos cortos: no hacer nada. Mesetas largas: revisar más o ensanchar la banda.
- La deriva se mide dentro del bloque, no sobre el patrimonio total.
- Sin libro de operaciones, el histórico es una estimación.

</div>
