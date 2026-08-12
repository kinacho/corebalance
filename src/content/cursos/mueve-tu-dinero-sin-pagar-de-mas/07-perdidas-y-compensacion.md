---
titulo: "Pérdidas: cómo compensan y cuándo no puedes"
descripcion: "El orden en que las pérdidas se restan de las ganancias, el límite del 25 % contra rendimientos, los cuatro años de arrastre y los errores que anulan todo."
orden: 7
gancho: "Una pérdida realizada vale dinero. Pero solo si la usas en el orden correcto y no la bloqueas por el camino."
minutos: 8
arquetipo: procedimiento
accion:
  texto: "Antes de vender nada en pérdidas, comprueba la ventana de recompra. Es el error que anula la compensación, y la fecha exacta se calcula en dos campos."
  cta: "Comprobar mi ventana"
  href: "/herramientas/cuando-puedo-recomprar"
lecturas:
  - texto: "Rebalancear sin pagar impuestos en España"
    href: "/blog/rebalancear-sin-pagar-impuestos-espana"
  - texto: "Qué pasa si no rebalanceo nunca mi cartera"
    href: "/blog/que-pasa-si-no-rebalanceo-cartera"
fuentes:
  - texto: "Ley 35/2006 del IRPF, art. 49 — integración y compensación en la base del ahorro"
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Vender en pérdidas duele. ¿Qué se puede sacar de una pérdida ya realizada?

<Pasos
	titulo="El orden en que se aplica una pérdida"
	pasos={[
		{
			titulo: 'Contra las ganancias del mismo año, sin límite',
			detalle: 'Si vendiste un fondo con 3.000 € de ganancia y otro con 2.000 € de pérdida, tributas por 1.000 €. Es la parte que casi todo el mundo conoce.'
		},
		{
			titulo: 'Contra los rendimientos, hasta el 25 % de ellos',
			detalle: 'Si sobran pérdidas después de anular todas tus ganancias, se usan contra dividendos e intereses, pero solo hasta una cuarta parte de esos rendimientos. Es un tope, no una prohibición.'
		},
		{
			titulo: 'Lo que quede, a los cuatro ejercicios siguientes',
			detalle: 'Con el mismo orden de prelación.',
			aviso: 'Cuatro años, no indefinidamente. Una pérdida grande sin ganancias que compensar puede caducar sin usarse, y eso pasa más de lo que parece en carteras que no venden casi nunca.'
		}
	]}
/>

<Comprueba
	pregunta="Realizas 4.000 € de pérdidas en un año en el que no has tenido ninguna ganancia. ¿Qué haces en la declaración?"
	opciones={[
		{
			texto: 'Nada: sin ganancias que compensar no hay que declararla',
			correcta: false,
			porque: 'Y es el error que más dinero cuesta de los tres, porque parece razonable. Una pérdida que no consta en la declaración del ejercicio en que se generó no se puede arrastrar después: la has tirado sin enterarte.'
		},
		{
			texto: 'Declararla igualmente, para poder arrastrarla cuatro años',
			correcta: true,
			porque: 'El arrastre solo funciona sobre lo declarado. Y hay que llevar la cuenta: los saldos pendientes se aplican solos si están declarados, pero cuatro años dan para olvidarse de que existen.'
		},
		{
			texto: 'Pedir la devolución del 19 % de esos 4.000 €',
			correcta: false,
			porque: 'Una pérdida no genera una devolución: reduce una base imponible futura o presente. Si no hay base, no hay nada que devolver — solo un saldo que guardar.'
		}
	]}
/>

## ¿Y qué anula todo esto?

Tres cosas, y la primera es la lección anterior. **Recomprar dentro de la ventana** —dos meses para ETFs, doce para fondos— difiere la pérdida y te quita el año. **No declararla** te quita el derecho al arrastre, como acabas de ver. Y **olvidar el arrastre** hace que caduque sola en el cuarto ejercicio.

## ¿Y quién te avisa de que ha pasado?

Nadie, y esa es la característica que comparten las tres. No hay ningún mensaje de tu bróker ni de Hacienda diciendo «acabas de bloquear 4.000 € de pérdidas»: se descubren cuando alguien las busca, normalmente años después, o no se descubren nunca.

Conviene ver la asimetría que eso crea, porque es la que decide cómo conviene operar. Equivocarse a favor de Hacienda no tiene ninguna consecuencia visible: la declaración sale bien, nadie la revisa y tú pagas de más sin enterarte. Equivocarse en contra sí la tiene. El sistema entero está inclinado hacia que la pérdida se pierda por descuido.

## ¿Qué se hace con eso, en la práctica?

Dos cosas aburridas y suficientes. Antes de vender algo que está por debajo de lo que te costó, mira la fecha de tu última compra de ese mismo producto — es una comprobación de diez segundos que evita el error caro. Y apunta la pérdida el año en que la realizas aunque ese año no tengas absolutamente nada contra lo que compensarla, porque el derecho a arrastrarla cuatro ejercicios nace de haberla declarado.

<div class="bloque aviso">

## Lo que no te van a contar

**Realizar pérdidas a propósito tiene un coste que no es fiscal.** Vendes, esperas la ventana —hasta un año en fondos— y durante ese tiempo estás fuera del mercado o en algo no homogéneo. El ahorro fiscal es cierto; el coste de oportunidad también, y es más difícil de calcular.

**El *tax loss harvesting* que leerás en inglés no se traduce.** Depende de poder elegir lotes —no puedes, es FIFO— y de ventanas de 30 días, que aquí son 60 o 365.

**Y para quien aporta y no vende, esto casi nunca se activa.** Aparece en un rebalanceo en mercado malo o al consolidar una cartera desordenada. Si no estás en ninguna de las dos, es cultura general; el día que lo estés, vale bastante dinero.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Orden: primero contra ganancias sin límite, luego contra rendimientos hasta el 25 %.
- Lo que sobre se arrastra **cuatro años**, y puede caducar.
- Declárala aunque no tengas nada que compensar ese año, o no podrás arrastrarla.
- La recompra prematura es lo que más veces anula la compensación.

</div>
