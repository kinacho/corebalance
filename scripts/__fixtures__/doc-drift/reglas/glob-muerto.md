---
paths:
  - "src/lib/fichero-que-no-existe.ts"
  - "scripts/**/*.mjs"
---

# Regla con un glob muerto

El primer `paths:` no casa con nada, así que esta regla no se cargaría nunca aunque
el segundo sí case. Que uno de los dos funcione es justo lo que lo hace peligroso.
