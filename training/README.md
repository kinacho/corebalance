# Fixtures de brókers

Este directorio guarda **exports reales de bróker** que se usan como fixtures de
los tests de importación. Está **ignorado por completo** en `.gitignore` (salvo
este README) porque esos ficheros contienen datos personales: ISIN, saldos,
movimientos de cuenta y números de orden.

> ⚠️ **No commitees nunca un export real.** El ignore cubre el directorio entero
> a propósito. Antes se listaban los ficheros uno a uno y por ese hueco acabaron
> subiéndose cuatro CSV con datos reales.

## Los tests pasan sin estos ficheros

Las dos suites que los consumen comprueban primero si existen y se omiten si no:

| Suite | Qué lee | Si falta |
|---|---|---|
| `src/lib/importers/parsers.test.ts` | `training/Account.csv` y `training/interactive_brokers_activity.csv` | Omite esos dos casos con un aviso; el resto de la suite (todos los detectores con fixtures en línea) sigue ejecutándose |
| `src/lib/importers/training_csv.test.ts` | Todos los `*.csv` de **este** directorio, en dry-run | Omite la suite entera con un aviso |

Es decir: **un clon limpio pasa `npm test` sin tener nada aquí.** Estos fixtures
sólo añaden cobertura extra sobre ficheros reales.

## Si quieres ejecutarlos con tus propios datos

1. Exporta el CSV desde tu bróker (historial de transacciones o estado de cuenta).
2. Déjalo **en este directorio**. Con el nombre exacto si quieres activar uno de
   los dos casos con nombre; con cualquier nombre para entrar en el dry-run.
3. `npm test`.

Nombres que buscan los tests hoy:

```
training/Account.csv                         estado de cuenta de DEGIRO
training/interactive_brokers_activity.csv    activity statement de IBKR
training/*.csv                               cualquier CSV, dry-run genérico
```

> El dry-run apuntaba a un directorio `training_csv/` que la purga del historial
> eliminó, así que se saltaba **siempre** — cero ficheros leídos y con el mismo
> aspecto verde que si comprobara algo. Ahora lee este directorio. El `skip`
> cuando no existe sigue siendo necesario: en un clon limpio esta carpeta no está.

## Formatos soportados

El detector correcto se elige solo. Lo que reconoce cada uno está en
`src/lib/importers/parsers.ts` (`ALL_DETECTORS`), y el orden importa: el estado
de cuenta de DEGIRO se evalúa antes que sus transacciones, y el genérico va el
último.

| Bróker | Export recomendado | Columnas que identifican el formato |
|---|---|---|
| DEGIRO (estado de cuenta) | *Estado de cuenta* | `Fecha`, `Producto`, `ISIN`, `Descripción`, `Saldo`, `ID Orden` |
| DEGIRO (transacciones) | *Transacciones* | `Fecha`, `Producto`, `ISIN`, `Número`, `Precio` |
| MyInvestor | Movimientos | `Estado`, tipo de operación, `Precio medio` |
| Trading 212 | Historial de órdenes | `Action`, `Ticker`, `No. of shares`, `Price / share` |
| Interactive Brokers | Activity Statement (CSV) | Bloques con `Header`/`Data`, `Symbol`, `Quantity`, `T. Price` |
| Genérico | Cualquiera | Se deducen por heurística; hay mapeo manual de columnas como último recurso |

Si añades soporte para un bróker nuevo, **anonimiza el fixture antes de
compartirlo**: sustituye importes, números de cuenta y de orden por valores
inventados, conservando el formato exacto de columnas, separadores y decimales,
que es lo único que el parser necesita.
