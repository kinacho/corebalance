# Documento deliberadamente roto

Existe para que el comprobador de deriva tenga algo que detectar. Un linter que deja
de detectar tiene exactamente el mismo aspecto que un repositorio limpio, así que
necesita su propio caso roto — la misma razón por la que `scripts/seo-audit.test.ts`
tiene su mini-build con errores dentro.

## Referencias que sí existen (no deben aparecer como huérfanas)

- La constante `CHART_NEUTRAL` vive en `src/lib/constants.ts`.
- `calculateRebalance()` está en `src/lib/rebalance.ts`, y el test al lado, en
  `rebalance.test.ts`.
- La ruta parcial `importers/parsers.ts` también resuelve.

## Referencias inventadas (deben salir las cuatro)

- La constante `PALETA_FANTASMA` no existe en ningún fichero.
- `funcionQueNoExiste()` tampoco.
- El fichero `src/lib/modulo-inexistente.ts` no está.
- Ni el directorio `src/lib/carpeta-que-no-existe/`.

## Cosas que no se deben comprobar nunca

Rutas de URL como `/dashboard` o `/en/`, banderas de CSS como
`--accent-inventado`, grupos de variables como `VAR_UNO/VAR_DOS` y extensiones
sueltas como `.html`.
