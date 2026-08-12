---
titulo: "Bandas o calendario: la comparación sin trampas"
descripcion: "Las dos formas de decidir cuándo actuar, qué gana cada una, y por qué casi todo el mundo con años de experiencia acaba usando las dos a la vez."
orden: 2
gancho: "El calendario te hace operar cuando no hace falta. Las bandas te hacen mirar. Cada una falla por un lado distinto."
minutos: 7
arquetipo: decidir
accion:
  texto: "Responde las cuatro preguntas del checklist con tu situación real. Te dice si toca actuar hoy y por qué — que es distinto de si te apetece actuar hoy."
  cta: "Pasar el checklist"
  href: "/herramientas/checklist-rebalanceo"
lecturas:
  - texto: "Cuándo rebalancear la cartera"
    href: "/blog/cuando-rebalancear-cartera"
  - texto: "Calculadora de rebalanceo en Excel: por qué se queda corta"
    href: "/blog/calculadora-rebalanceo-cartera-excel"
---

<script>
  import Comprueba from '$lib/components/cursos/Comprueba.svelte';
  import Pasos from '$lib/components/cursos/Pasos.svelte';
</script>

Ya tienes el reparto y las bandas. ¿Qué te hace mirar la cartera un día concreto?

<Comprueba
	pregunta="Revisión semestral: en junio estás a 1,5 puntos de tu objetivo. ¿Ajustas?"
	opciones={[
		{
			texto: 'Sí: he abierto la cartera para revisarla, eso es lo que toca',
			correcta: false,
			porque: 'Es el defecto propio del calendario y por eso conviene verlo: te hace operar cuando no hace falta. Corregir 1,5 puntos cuesta comisiones y tiempo para arreglar algo que no era un problema.'
		},
		{
			texto: 'No: revisar y actuar son dos decisiones distintas',
			correcta: true,
			porque: 'El calendario decide cuándo miras; la banda decide si tocas. Separarlas es lo que resuelve los defectos de las dos, y es la regla más común entre quienes llevan una década en esto.'
		},
		{
			texto: 'Depende de si creo que va a seguir desviándose',
			correcta: false,
			porque: 'Eso es previsión, y en cuanto entra en la decisión ya no estás rebalanceando: estás operando con una opinión sobre el mercado, que es justo lo que la regla venía a impedir.'
		}
	]}
/>

## Cada una falla por un lado

**Por calendario** revisas cada X meses y ajustas lo que se haya movido. A favor: no exige atención, lo pones en el calendario y es imposible que la cartera derive años sin que nadie mire. En contra: te hace operar cuando no hace falta, como acabas de ver.

**Por bandas** actúas cuando una posición se sale de su margen. A favor: solo operas cuando importa — en años tranquilos no tocas nada y en años movidos actúas justo cuando el riesgo se ha desviado de verdad. En contra: exige mirar, y una banda que nadie comprueba no existe. Ahí es donde falla en la práctica: la gente pone bandas y luego pasa ocho meses sin abrir la cartera.

<Pasos
	titulo="La regla que usa casi todo el mundo con años encima"
	pasos={[
		{
			titulo: 'Fija una revisión en el calendario',
			detalle: 'Trimestral o semestral. Con eso garantizas que miras, que es lo que las bandas no garantizan.'
		},
		{
			titulo: 'Ese día, mira solo si algo está fuera de banda',
			detalle: 'No cuánto ha subido, no cómo va el año. Solo si alguna posición se ha salido de sus puntos.'
		},
		{
			titulo: 'Si no lo está, cierra la cartera y no hagas nada',
			detalle: 'Es el paso que da valor a los otros dos y el que más cuesta.',
			aviso: 'Haber dedicado media hora a revisar crea la sensación de que hay que hacer algo. Es la misma trampa que hace operar de más a quien solo usa calendario.'
		}
	]}
/>

## ¿Cada cuánto conviene revisar?

Trimestral o semestral basta para una cartera indexada: mensual invita a tocar y anual deja demasiado margen para derivar. Y una advertencia que suena rara en una herramienta que te enseña tu desviación en tiempo real: **mirar más a menudo no mejora nada y probablemente empeora**, porque ver la cifra todos los días entrena a reaccionar.

Por eso el mapa de esta app colorea la distancia a tu objetivo y no la variación del día. Es una decisión de producto y no un descuido: el color del día te enseñaría a mirar el día, que es justo el hábito que una cartera indexada no necesita.

<div class="bloque aviso">

## Lo que no te van a contar

**No hay una frecuencia óptima demostrada.** Hay estudios para casi cualquier respuesta, y las diferencias entre trimestral, semestral y anual son pequeñas comparadas con la diferencia entre hacerlo y no hacerlo.

**La banda importa más que la frecuencia.** Una banda estrecha con revisión anual opera más que una ancha con revisión mensual. Si vas a afinar algo, afina la banda.

**Y una hoja de cálculo funciona perfectamente para esto** hasta que tienes seis posiciones, dos divisas y un libro de operaciones que mantener a mano. Ahí se rompe, y no antes.

</div>

<div class="bloque retener">

## Lo que hay que retener

- Calendario: no exige atención, pero te hace operar de más.
- Bandas: solo actúas cuando importa, pero exige mirar.
- La combinación —revisión por calendario, acción por bandas— resuelve las dos.
- Trimestral o semestral basta. Mirar a diario entrena a reaccionar.

</div>
