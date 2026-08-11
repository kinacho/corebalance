---
titulo: "TWR vs MWR: lo que rindió tu cartera y lo que rendiste tú"
descripcion: "Dos formas de medir la rentabilidad que casi nunca coinciden, qué mide cada una y por qué mirar solo una te da una idea equivocada de cómo lo estás haciendo."
orden: 4
gancho: "Tu cartera puede haber rendido un 8 % y tú un 4 %. Las dos cifras son correctas y miden cosas distintas."
minutos: 8
accion:
  texto: "El panel te da las dos cifras sobre tu histórico real. Si nunca has aportado ni vendido en el periodo, coincidirán: la diferencia solo aparece cuando has movido dinero."
  cta: "Ver mis dos rentabilidades"
  href: "/"
lecturas:
  - texto: "Importar el CSV de Interactive Brokers"
    href: "/blog/importar-csv-interactive-brokers"
  - texto: "Importar movimientos de MyInvestor"
    href: "/blog/importar-movimientos-myinvestor"
---

«¿Cuánto ha rendido mi cartera?» tiene dos respuestas y las dos son ciertas.

## TWR: lo que hicieron tus activos

La **rentabilidad ponderada por tiempo** mide cómo se comportaron tus inversiones, neutralizando el efecto de cuándo metiste o sacaste dinero.

Es la cifra que publican los fondos, y la correcta para **comparar**: si quieres saber si tu cartera lo hizo mejor o peor que un índice, esta es la que sirve. Aportar o vender no la mueve.

## MWR: lo que hiciste tú

La **rentabilidad ponderada por dinero** sí tiene en cuenta cuándo y cuánto moviste. Es tu rentabilidad real como inversor: qué le pasó a **tu dinero**, con el tamaño que tenía en cada momento.

Si aportaste mucho justo antes de una caída, la MWR lo refleja. La TWR no.

## Por qué la diferencia es la información

La resta de las dos es lo que suele llamarse **el coste de tu timing**:

- **MWR por debajo de TWR**: metiste más dinero justo antes de los tramos malos.
- **MWR por encima**: aportaste antes de los buenos.
- **Iguales**: no has movido dinero en el periodo, o tus movimientos fueron neutrales.

Y ojo con la conclusión moral: una MWR peor **no significa que lo hicieras mal**. Aportar cada mes es aportar también en los meses malos, y eso es exactamente lo que hay que hacer. La cifra no juzga tu disciplina; describe cómo cayeron las fechas.

## Lo que hace falta para calcularlas

Tu libro de operaciones. Sin las fechas y los importes de cada aportación y cada venta, la MWR **no se puede calcular** — no es una limitación de la herramienta, es que la pregunta no tiene respuesta sin esos datos.

Por eso importar el CSV del bróker es lo que convierte esta lección en un número tuyo en vez de un concepto.

<div class="bloque aviso">

## Lo que no te van a contar

**Casi todas las apps te enseñan solo una, y no dicen cuál.** Si tu bróker te da «rentabilidad» a secas, probablemente sea una MWR simplificada — o peor, una diferencia entre valor actual y dinero aportado, que no es ninguna de las dos y no es comparable con nada.

**Y hay un detalle técnico que cambia el resultado**: si una aportación se cuenta al principio o al final de su día. Si las dos cifras no usan la misma convención, la diferencia entre ellas incluye un residuo que no es timing sino artefacto de cálculo. Aquí ambas usan la misma, y hay tests que lo fijan precisamente porque es el tipo de error que nadie nota.

**Los tramos estimados no entran.** Los días que la reconstrucción no puede ver de verdad se excluyen de las dos cifras. Meterlos las contamina: en un caso medido, incluir dos días estimados subía la rentabilidad del periodo del 2,00 % al 13,33 %.

</div>

<div class="bloque retener">

## Lo que hay que retener

- TWR mide tus activos y sirve para comparar. MWR mide tu dinero.
- La diferencia es el efecto de cuándo moviste dinero.
- Una MWR peor no significa que lo hicieras mal.
- Sin libro de operaciones, la MWR no existe.

</div>

