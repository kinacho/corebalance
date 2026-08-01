# Política de seguridad

## Cómo reportar una vulnerabilidad

**No abras una issue pública.** Escribe a **kino166@gmail.com** con el asunto
`[SEGURIDAD] CoreBalance`.

Incluye, si puedes:

- Qué has encontrado y qué impacto crees que tiene.
- Pasos para reproducirlo.
- Versión o commit en el que lo has visto.

Lo mantiene una sola persona en su tiempo libre, así que no puedo prometer un
plazo de respuesta. Lo que sí: te confirmaré que lo he recibido y te diré si lo
voy a arreglar y por dónde van los tiros.

## Qué entra en el alcance

CoreBalance es una aplicación **local-first**: los datos de cartera viven en el
navegador (IndexedDB) y el cálculo es todo del lado del cliente. Lo que más
interesa:

- Cualquier vía por la que datos de cartera salieran del dispositivo sin que el
  usuario lo haya pedido.
- Fallos en la sincronización opcional con Firebase que permitan a un usuario
  leer o escribir los datos de otro (ver `firestore.rules`).
- XSS a través de contenido importado: nombres de activo o campos de un CSV de
  bróker que acaben ejecutándose.
- Saltarse el rate limiting de los endpoints de `/api/` o usarlos como proxy.
- Exposición de secretos de servidor (Upstash, Resend) en el bundle del cliente.

## Qué no entra

- Las variables `VITE_FIREBASE_*` son **públicas por diseño**: viajan al
  navegador, como en cualquier app cliente de Firebase. La protección real está
  en `firestore.rules`, y ahí sí quiero saber de fallos.
- Errores de cálculo financiero: son bugs importantes, pero van por una issue
  normal, no por aquí.
- Resultados de escáneres automáticos sin un impacto demostrado.

## Aviso

CoreBalance es una herramienta de cálculo con fines informativos. No constituye
asesoramiento financiero. Los datos que introduzcas son tuyos y permanecen en tu
navegador salvo que actives la sincronización en la nube de forma explícita.
