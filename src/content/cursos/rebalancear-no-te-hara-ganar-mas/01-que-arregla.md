---
titulo: "Qué arregla rebalancear de verdad, y qué no"
descripcion: "Por qué rebalancear no es una técnica de rentabilidad, qué problema resuelve realmente y en qué condiciones sí puede aportar algo."
orden: 1
gancho: "Si te han vendido el rebalanceo como una forma de ganar más, te han vendido algo que los datos no sostienen."
minutos: 7
arquetipo: desmontar
accion:
  texto: "Mira tu cartera y responde a una pregunta: ¿en qué se parece hoy al reparto que decidiste? Si no lo sabes de memoria, ese es exactamente el problema que resuelve rebalancear."
  cta: "Ver mi desviación actual"
  href: "/"
lecturas:
  - texto: "Qué pasa si no rebalanceo nunca mi cartera (con el backtest real)"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
  - texto: "Cómo rebalancear una cartera indexada"
    href: "/blog/como-rebalancear-cartera-indexada"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Barras from '$lib/components/cursos/Barras.svelte';
  import { BACKTEST, eur } from '$lib/cursos-datos';

  const pesos = [
    { etiqueta: 'El reparto que había elegido', valor: BACKTEST.objetivoRV, tono: 'a' },
    { etiqueta: 'Con el que acabó sin rebalancear nunca', valor: BACKTEST.sinRebalancear.pesoRVFinal, tono: 'b' }
  ];
</script>

Rebalancear cuesta tiempo, comisiones y a veces impuestos. ¿Qué compras exactamente con eso?

No es rentabilidad, y conviene decirlo antes que nada. Con series reales de 2010 a 2026, la cartera que **no** se rebalanceó terminó con {eur(BACKTEST.diferencia)} € más. Lo que compras es esto:

<Barras
	series={pesos}
	unidad=" %"
	max={100}
	titulo="Porcentaje en renta variable al final de dieciséis años"
	fuente={BACKTEST.procedencia.fuente}
	fecha={BACKTEST.procedencia.fecha}
	nota="Cartera 80/20 con 10.000 € iniciales y sin aportaciones, de enero de 2010 a julio de 2026."
/>

<Comprueba
	pregunta="Esa cartera ganó más y acabó con mucha más bolsa de la que su dueño eligió. ¿Cómo se llama eso?"
	opciones={[
		{
			texto: 'Suerte: le salió bien una apuesta más arriesgada',
			correcta: false,
			porque: 'Suerte hubo, pero el problema no es el resultado: es que nunca hizo esa apuesta. Nadie decidió subir el riesgo — se subió solo, un poco cada año, durante dieciséis.'
		},
		{
			texto: 'Deriva: el riesgo cambió sin que nadie lo decidiera',
			correcta: true,
			porque: 'Y es lo que rebalancear existe para evitar. Si el año diecisiete hubiera sido 2008, esa cartera habría caído como lo que era y no como lo que su dueño creía tener. La ventaja se construyó asumiendo un riesgo que no eligió.'
		},
		{
			texto: 'Una estrategia de crecimiento perfectamente válida',
			correcta: false,
			porque: 'Lo sería si estuviera escrita. «Dejo correr la renta variable y acepto llegar al 95 %» es una política legítima; lo que no lo es es acabar ahí creyendo que sigues en un 80/20.'
		}
	]}
/>

## Entonces, ¿por qué se dice que hace ganar más?

Porque mecánicamente te hace vender lo que ha subido y comprar lo que ha bajado, y de ahí se salta a que mejora el resultado. La primera parte es cierta; la segunda no se sigue. En un periodo largo y bueno para la bolsa, dejar correr la parte que más sube casi siempre gana — lo que pasa es que eso no se puede saber por adelantado, que es exactamente el motivo por el que no sirve como estrategia.

Rebalancear es **control de riesgo**, no optimización de retorno. Todo lo demás en este curso sale de esa frase.

## ¿Cuándo sí puede aportar rentabilidad?

Hay condiciones en las que también rinde más, y conviene nombrarlas para no caer en el extremo contrario. Entre activos con rentabilidades esperadas parecidas y poca correlación, el rebalanceo captura las oscilaciones relativas sin renunciar a nada. En mercados laterales o con reversión a la media, donde lo que sube vuelve, también. Y en periodos con caídas fuertes al final, porque llegas con menos riesgo del que tendrías dejándolo correr.

Lo que no puedes es saber en cuál de esos tres estás mientras estás dentro. Por eso la razón para rebalancear no puede ser ninguna de las tres.

<div class="bloque aviso">

## Lo que no te van a contar

**El coste de rebalancear casi nunca sale en los backtests**: comisiones, horquilla, impuestos y días fuera de mercado. En España, con fondos, los impuestos desaparecen por el traspaso — pero eso es una ventaja local que ningún estudio internacional incluye.

**«Rebalanceo» y «cambiar de estrategia» se confunden todo el rato.** Ajustar pesos para volver a tu objetivo es rebalancear; cambiar el objetivo porque el mercado ha hecho algo es otra cosa, y es la que hace daño.

**Y hay una versión que no tiene ninguno de estos costes**: hacerlo con aportaciones. Va en la lección 3, y en fase de acumulación es casi siempre la respuesta.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Rebalancear no mejora la rentabilidad esperada. Los datos lo dicen.
- Lo que hace es mantener el riesgo que elegiste.
- Sin rebalancear, la cartera deriva hacia lo que más ha subido — y hacia más riesgo.
- Ajustar pesos es rebalancear. Cambiar el objetivo es otra cosa.

</div>
