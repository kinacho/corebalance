---
titulo: "El traspaso: cambiar de fondo sin tributar"
descripcion: "Qué es el régimen de diferimiento del artículo 94, qué requisitos tiene, cuánto tarda y por qué es la mayor ventaja del inversor indexado español."
orden: 3
gancho: "Es la única figura de este curso que juega a tu favor. Y es lo que hace que el manual estadounidense no te sirva."
minutos: 8
arquetipo: procedimiento
accion:
  texto: "Si tienes posiciones desviadas de su objetivo, el panel fiscal empareja las que sobran con las que faltan y calcula cuánto se puede mover por traspaso —sin tributar— y cuánto no. Con tus operaciones."
  cta: "Calcular mi traspaso"
  href: "/dashboard"
lecturas:
  - texto: "Traspasos de fondos indexados y Hacienda"
    href: "/blog/traspasos-fondos-indexados-hacienda"
  - texto: "Rebalanceo en MyInvestor sin impuestos"
    href: "/blog/rebalanceo-myinvestor-sin-impuestos"
fuentes:
  - texto: "Ley 35/2006 del IRPF, art. 94 — tributación de socios y partícipes de IIC"
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Vender un fondo que ha subido realiza una ganancia y se tributa. ¿Por qué en España a veces no?

<Pasos
	titulo="Qué tiene que cumplirse para que sea un traspaso y no una venta"
	pasos={[
		{
			titulo: 'Que las dos patas sean fondos',
			detalle: 'Fondos de inversión o SICAV que cumplan requisitos. Ni el origen ni el destino pueden ser un ETF, y eso es la lección siguiente.'
		},
		{
			titulo: 'Que el dinero no pase por tu cuenta',
			detalle: 'Se pide el traspaso a la entidad de destino, que lo tramita con la gestora de origen.',
			aviso: 'Este es el paso que se estropea solo. Si vendes tú y compras al día siguiente, has hecho una venta y una compra: has tributado, y ya no hay vuelta atrás.'
		},
		{
			titulo: 'Que se tramite como traspaso, con su formulario',
			detalle: 'Es un detalle administrativo que arruina el resto si se olvida. Pídelo en el destino, no en el origen.'
		},
		{
			titulo: 'Esperar entre unos días y dos semanas',
			detalle: 'Durante ese tiempo estás fuera del mercado. Es el coste real del traspaso, y no es fiscal: es de exposición.'
		}
	]}
/>

## Cómo funciona por dentro

El artículo 94 de la Ley del IRPF establece un régimen de **diferimiento**: al reembolsar participaciones de una institución de inversión colectiva para suscribir otras, no se computa la ganancia patrimonial en ese momento. La plusvalía acumulada **se arrastra** al fondo nuevo, con su fecha y su valor de adquisición originales.

No es una exención, es un aplazamiento, y la diferencia entre las dos palabras es todo lo que hay que entender aquí. Como ya vimos en el curso anterior, aplazar con interés compuesto de por medio vale dinero: el euro que no pagas hoy sigue trabajando hasta el día en que vendas de verdad, que puede ser dentro de veinte años o nunca.

<Comprueba
	pregunta="Traspasas 30.000 € de un fondo con 8.000 € de plusvalía a otro fondo. ¿Qué pasa con esos 8.000 €?"
	opciones={[
		{
			texto: 'Desaparecen: al no tributar, la ganancia se reinicia',
			correcta: false,
			porque: 'Sería una exención, y esto no lo es. Si fuera así, traspasar cada año sería una máquina de borrar plusvalías y la norma no duraría un mes.'
		},
		{
			texto: 'Viajan al fondo nuevo con su fecha y su valor de compra originales',
			correcta: true,
			porque: 'El fondo nuevo nace con la plusvalía del viejo dentro. Por eso el traspaso no borra nada: la esconde a la vista, y es fácil llevarse una sorpresa el día que vendas si no conservas el libro de operaciones.'
		},
		{
			texto: 'Tributan, pero al tipo reducido del 19 % por ser un traspaso',
			correcta: false,
			porque: 'No hay tipo reducido ni hecho imponible. La confusión viene de que el 19 % es el primer tramo de la escala del ahorro, que aquí no llega a aplicarse.'
		}
	]}
/>

## ¿Por qué esto cambia todo el curso?

Porque cambia la respuesta a casi todas las preguntas que quedan. **Rebalancear** deja de ser caro, porque mueves de lo que sobra a lo que falta sin realizar nada. **Equivocarte al elegir fondo** deja de ser grave, porque te traspasas. **Consolidar** una cartera desordenada de seis fondos a dos es gratis. Y **cambiar de comercializador** no cuesta impuestos.

Ninguna de esas cuatro cosas es cierta con ETFs, y ninguna aparece en la literatura internacional, porque esta figura no existe en casi ningún sitio. Cuando leas que rebalancear es fiscalmente caro, acuérdate de que quien lo escribe no tiene esto.

<div class="bloque aviso">

## Lo que no te van a contar

**La ventana fuera de mercado es un riesgo real, no un trámite.** Si el mercado sube un 3 % durante los diez días de tu traspaso, has pagado más de lo que te ahorrabas. Con importes grandes conviene traspasar por tramos.

**No todos los fondos son traspasables entre sí en la práctica.** El régimen fiscal lo permite; la operativa depende de que ambas entidades tengan acuerdo. Comprueba antes de contar con ello.

</div>

<div class="bloque retener">

## Lo que hay que retener

- El artículo 94 permite cambiar de fondo sin tributar: la ganancia se arrastra.
- Solo fondos, y el dinero no puede pasar por tu cuenta.
- El coste real no es fiscal: son los días fuera de mercado.
- Con esto, rebalancear y corregir errores dejan de ser caros.

</div>
