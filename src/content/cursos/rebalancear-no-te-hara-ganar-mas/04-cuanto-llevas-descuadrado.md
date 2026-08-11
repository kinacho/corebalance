---
titulo: "Cuánto tiempo llevas descuadrado"
descripcion: "La pregunta que ninguna otra herramienta contesta: no dónde estás hoy, sino cuánto tiempo llevas fuera de tu banda y si los rebalanceos que hiciste sirvieron de algo."
orden: 4
gancho: "Saber que hoy estás a 6 puntos no dice nada. Saber que llevas ocho meses a más de 5 lo dice todo."
minutos: 7
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

Todas las herramientas de cartera contestan «¿cómo estoy hoy?». Esta lección va de la otra pregunta, la que no contesta ninguna.

## Por qué el hoy no basta

Una foto de tu desviación actual te dice si actuar ahora. No te dice nada de lo que ha pasado, y ahí está la información útil:

- **¿Es la primera vez que me salgo, o llevo así medio año?** Salirse un mes por una racha es ruido. Llevar ocho meses fuera significa que tu banda no está funcionando: o no la revisas, o es demasiado estrecha para lo que estás dispuesto a hacer.
- **¿Los rebalanceos que hice sirvieron?** Si cada vez que ajustas vuelves a salirte en tres semanas, no estás rebalanceando: estás persiguiendo el mercado con comisiones.
- **¿Cuánto riesgo he tenido de más, y durante cuánto?** Un 93,6 % en bolsa durante dos meses es una cosa. Durante seis años es otra.

## Lo que mide el gráfico

Para cada activo con objetivo, la distancia en puntos porcentuales a ese objetivo, cada día. Con la banda dibujada como una zona, no como dos líneas: lo que quieres leer es si estás dentro, no cruzar números.

⚠️ Y una decisión que importa: **la deriva se mide dentro del bloque, nunca sobre el patrimonio total.** Tus objetivos son pesos dentro de tu cartera principal; si tus acciones individuales suben mucho, tu cartera principal pesa menos sobre el total sin que nada dentro de ella se haya desviado. Medirlo sobre el total inventaría una desviación cada vez que se mueve algo que no tiene objetivo.

## Qué hacer con lo que veas

- **Picos cortos que vuelven solos**: no hagas nada. Es exactamente el caso para el que existe la banda.
- **Meseta larga fuera de banda**: revisa la frecuencia con la que miras, o ensancha la banda a un número que sí vayas a cumplir. Una banda incumplida es peor que una banda ancha.
- **Sierra —dentro, fuera, dentro, fuera—**: tu banda es demasiado estrecha para la volatilidad de esa posición.

<div class="bloque aviso">

## Lo que no te van a contar

**Esto necesita histórico, y el histórico necesita tu libro de operaciones.** Sin las fechas de tus compras no se puede reconstruir cuántas participaciones tenías cada día, y el gráfico dibuja una estimación en vez de un dato. Por eso importar el CSV del bróker no es cosmética.

**Ni Ghostfolio ni Portfolio Performance lo enseñan**, y no por descuido: enseñan cuánto tienes y cuánto ha rendido, porque no son herramientas de rebalanceo. La pregunta «cuánto llevo descuadrado» solo se le ocurre a quien tiene un objetivo escrito.

**Y una cartera perfectamente ajustada da un gráfico aburridísimo**, pegado al cero. Eso es lo que quieres ver. Si tu gráfico es emocionante, algo va mal.

</div>

<div class="bloque retener">

## Lo que hay que retener

- La desviación de hoy dice si actuar; el histórico dice si tu sistema funciona.
- Picos cortos: no hacer nada. Mesetas largas: revisar más o ensanchar la banda.
- La deriva se mide dentro del bloque, no sobre el patrimonio total.
- Sin libro de operaciones, el histórico es una estimación.

</div>

