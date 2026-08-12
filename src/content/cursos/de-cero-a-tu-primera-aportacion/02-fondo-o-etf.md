---
titulo: "Fondo o ETF: las tres diferencias que en España sí importan"
descripcion: "El traspaso, la operativa y los costes de compraventa. Por qué la comparación que se hace en inglés no sirve tal cual para un inversor español."
orden: 2
gancho: "Casi todo lo que leerás sobre esto está escrito para un inversor estadounidense. Aquí hay una figura fiscal que lo cambia todo."
minutos: 8
arquetipo: decidir
accion:
  texto: "Busca en la app un fondo por su ISIN y otro por su ticker. Fíjate en el tipo de instrumento que detecta: es lo que decide si un traspaso es posible o no."
  cta: "Probar con la cartera de ejemplo"
  href: "/"
lecturas:
  - texto: "Fondos indexados vs ETFs en España: la comparación completa"
    href: "/blog/fondos-indexados-vs-etfs-espana"
  - texto: "Traspasos de fondos indexados y Hacienda"
    href: "/blog/traspasos-fondos-indexados-hacienda"
fuentes:
  - texto: "Ley 35/2006 del IRPF, art. 94 — régimen de diferimiento en instituciones de inversión colectiva"
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Cifras from '$lib/components/cursos/Cifras.svelte';
  import Cifra from '$lib/components/cursos/Cifra.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Si los dos replican el mismo índice y cuestan casi lo mismo, ¿por qué en España la respuesta se da la vuelta?

En cualquier comparación escrita para el mercado estadounidense gana el ETF: allí es más barato y más eficiente fiscalmente. Esa comparación se importa entera a los foros españoles, y le falta una pieza que aquí decide.

<Comprueba
	pregunta="Tienes 20.000 € en un fondo indexado y quieres cambiarte a otro fondo, del mismo índice y más barato. ¿Cuánto pagas a Hacienda al hacerlo?"
	opciones={[
		{
			texto: 'Nada, si el dinero va directo de un fondo al otro',
			correcta: true,
			porque: 'Es el régimen de diferimiento del artículo 94 de la Ley del IRPF: mientras el importe no pase por tu cuenta, no se considera que hayas realizado la ganancia. No desaparece —se arrastra al fondo nuevo— pero no pagas ahora.'
		},
		{
			texto: 'El impuesto sobre la ganancia acumulada, como en cualquier venta',
			correcta: false,
			porque: 'Es lo que pasaría con un ETF, y lo que dice cualquier guía estadounidense, porque allí esta figura no existe. Con fondos españoles o europeos comercializados aquí, no.'
		},
		{
			texto: 'Una comisión de traspaso del comercializador',
			correcta: false,
			porque: 'No suelen cobrar por traspasar. Lo que sí varía es cuánto tardan: días, no minutos.'
		}
	]}
/>

## 1. El traspaso, que es la diferencia grande

Un ETF **no** entra en ese régimen, aunque replique el mismo índice y se llame casi igual: venderlo para comprar otro es vender, y se tributa ese año. Con fondos puedes cambiar de producto, rebalancear o corregir un error sin que Hacienda pase por caja; con ETFs, cada cambio de idea tiene precio. Y no es simbólico — con 8.000 € de plusvalía acumulada, esto cuesta el mismo cambio por las dos vías:

<Cifras fuente="Escala del ahorro del IRPF (Ley 35/2006), calculada sobre 8.000 € de ganancia" fecha="Ejercicio 2026">
	<Cifra valor="0" unidad=" €" etiqueta="Traspasar de fondo a fondo" matiz="La ganancia se arrastra al fondo nuevo." tono="bien" />
	<Cifra valor="1.560" unidad=" €" etiqueta="Vender un ETF y comprar otro" matiz="19 % hasta 6.000 € y 21 % sobre el resto." tono="mal" />
</Cifras>

## 2. La operativa

Un fondo tiene **un solo precio al día**, su valor liquidativo: das la orden sin saber exactamente a qué precio se ejecutará, y tarda entre uno y varios días hábiles. Un ETF cotiza en bolsa y se compra en tiempo real, como una acción.

Suena a ventaja del ETF, y para un trader lo es. Para alguien que aporta una vez al mes durante veinte años, comprar a las 11:43 en vez de al cierre no cambia nada. Y la inmediatez tiene un coste escondido: **facilita hacer cosas**. La fricción del fondo, que parece un defecto, protege del peor enemigo de esta estrategia, que eres tú un martes de pánico.

## 3. ¿Qué cuesta operar con cada uno?

El fondo se suscribe y se reembolsa sin comisión de compraventa. El ETF paga comisión en cada operación y, si cotiza en otra divisa, cambio de moneda: 1 € sobre 100 € aportados es un 1 %, que se come una ventaja de TER de 0,05 %.

<Pasos
	titulo="El mismo cambio de idea, por las dos vías"
	pasos={[
		{
			titulo: 'Con fondos',
			detalle: 'Pides el traspaso en el comercializador de destino. Él reclama las participaciones al de origen y las liquida contra el fondo nuevo. Tú no tocas el dinero.',
			aviso: 'Estás fuera del mercado los días que dure. Es el coste real del traspaso, y no aparece en ninguna tarifa.'
		},
		{
			titulo: 'Con ETFs',
			detalle: 'Vendes, esperas la liquidación, compras. Declaras la ganancia en la renta del año siguiente.',
			aviso: 'El impuesto no sale de la cartera: sale de tu cuenta.'
		}
	]}
/>

**La regla de decisión**, en una frase: si vas a mantener el mismo producto durante décadas y aportas mucho de golpe, el ETF compite; si contemplas cambiar alguna vez de fondo o de reparto, el traspaso lo decide.

<div class="bloque aviso">

## Lo que no te van a contar

**«Los fondos indexados españoles son más caros» era más cierto hace cinco años.** Compara los productos concretos que puedes contratar, no las categorías.

**Y hay un caso en el que esto casi no importa**: si vas a necesitar el dinero pronto, la discusión es irrelevante al lado de cuánto llevas en renta variable.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Un fondo se traspasa sin tributar; un ETF no. Esa es la diferencia grande en España.
- El fondo tiene un precio al día; el ETF cotiza. Para aportar cada mes, da igual.
- El ETF paga comisión por operación y a veces divisa; el fondo, normalmente no.
- La comparación que leas en inglés no incluye el traspaso, porque allí no existe.
- Elige ETF si no piensas moverte; elige fondo si crees que cambiarás de idea.

</div>
