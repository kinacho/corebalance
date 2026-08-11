---
titulo: "Dividendos, retenciones y doble imposición"
descripcion: "Qué se te retiene cuando cobras un dividendo, qué pasa con los que vienen del extranjero y qué parte de todo esto ocurre dentro del fondo sin que la veas."
orden: 6
gancho: "Hay tres capas de impuesto sobre un dividendo y solo una aparece en tu declaración. Las otras dos ya te las cobraron."
minutos: 8
accion:
  texto: "Pon tu capital y tu rentabilidad por dividendo: la calculadora aplica la escala año a año y te dice cuánto se lleva Hacienda por el camino frente a diferirlo dentro de un fondo de acumulación."
  cta: "Calcular el coste de cobrarlos"
  href: "/herramientas/acumulacion-vs-distribucion"
lecturas:
  - texto: "Dividendos de ETFs en DeGiro: retenciones y cómo declararlos"
    href: "/blog/dividendos-etfs-degiro"
  - texto: "MSCI World Acc vs Dist"
    href: "/blog/msci-world-acc-vs-dist"
---

<script>
  import CalculadoraAccDist from '$lib/components/cursos/CalculadoraAccDist.svelte';
</script>

Un dividendo recorre tres peajes antes de llegar a tu bolsillo. Solo el tercero es tuyo de gestionar.

## Capa 1: dentro de la empresa, fuera de tu vista

Cuando una empresa estadounidense paga un dividendo a un fondo domiciliado en Irlanda, Estados Unidos **retiene en origen**. Ese dinero no llega nunca al fondo, así que tampoco a ti.

No aparece en tu declaración. Aparece —diluido y sin nombre— en la **tracking difference** del fondo: la diferencia entre lo que hizo el índice y lo que hizo tu producto. Es un coste real e invisible.

⚠️ Y ahí el **domicilio del fondo importa más que si es Acc o Dist.** Irlanda tiene un convenio con Estados Unidos que reduce esa retención; otros domicilios no tanto. Es la razón de que casi todos los indexados europeos serios sean irlandeses o luxemburgueses, y casi nadie lo menciona en las comparativas Acc/Dist.

## Capa 2: al llegarte, si el fondo reparte

Si tu fondo es de **distribución**, ese dividendo te llega y entra en la base del ahorro del ejercicio, en la escala de la lección 1. Tu entidad te practica una retención a cuenta.

Si es de **acumulación**, no te llega: se reinvierte dentro. No hay hecho imponible para ti, y ese es todo el argumento del curso anterior.

<CalculadoraAccDist compacta />

<p class="pie-calc">Lo que cuesta cobrarlos frente a diferirlos, con la escala progresiva aplicada año a año.</p>

## Capa 3: la doble imposición, cuando el dividendo es extranjero

Si cobras dividendos directamente de acciones extranjeras —no a través de un fondo— pueden estar retenidos allí **y** tributar aquí. Los convenios de doble imposición permiten deducir parte de lo retenido en origen, pero:

- la deducción tiene un límite,
- hay que pedirla en la declaración, y
- si allí te retuvieron más de lo que el convenio permite, recuperar la diferencia se pide **en el país de origen**, con su papeleo.

Es una de las razones prácticas por las que un fondo global te ahorra trabajo: gestiona todo eso dentro.

<div class="bloque aviso">

## Lo que no te van a contar

**La retención a cuenta no es el impuesto.** Es un anticipo. Si te retienen más de lo que te corresponde por escala, se devuelve al declarar; si menos, pagas la diferencia. Que te retengan no significa que ya esté todo hecho.

**Un año con muchos dividendos te sube el tramo de tus ventas.** Comparten base. Es un efecto de segundo orden que nadie considera al elegir distribución, y que la calculadora sí recoge porque aplica la escala progresiva y no un tipo fijo.

**Y «vivir de los dividendos» es fiscalmente peor que vender.** Al cobrar un dividendo tributa el **importe entero**; al vender participaciones solo tributa la **ganancia** de lo vendido. Para una misma cantidad de dinero en la mano, vender suele pagar menos. Cuesta de creer y es una de las cosas más útiles de este curso.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Tres capas: retención en origen (invisible), tu tributación al cobrarlo, y la doble imposición si es directo.
- El domicilio del fondo decide la primera capa; Acc/Dist decide la segunda.
- La retención es un anticipo, no el impuesto final.
- Vender una parte suele tributar menos que cobrar el mismo importe en dividendos.

</div>

