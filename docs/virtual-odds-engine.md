# Virtual Odds Engine - Implementacion Final

## Objetivo

Implementar el reemplazo del pricing parimutuel por un motor de probabilidades pregeneradas por carrera.

Reglas vigentes:

- Las cuotas se generan antes de abrir cada carrera.
- Las cuotas no dependen del dinero apostado.
- `RaceOdds.currentOdds` sigue siendo la fuente oficial de cuotas.
- `RaceOdds.totalAmount` se conserva solo para reportes, analitica y exposicion.
- `TicketDetail.odds` sigue congelando la cuota vendida.
- Settlement sigue liquidando con `TicketDetail.odds`.

## Resumen de implementacion

La implementacion final usa un generador deterministico por carrera y elimina el repricing por pool apostado.

Componentes principales:

- `VirtualOddsService` genera probabilidades y cuotas fijas para `WINNER`, `EXACTA` y `TRIFECTA`.
- `RaceEngineService.createNextRace()` crea el mercado y publica cuotas inmediatamente.
- `OddsEngineService.applyTicketDetails()` actualiza `RaceOdds.totalAmount` sin tocar `currentOdds`.
- `GET /odds/race/:raceId` y `GET /odds/race/:raceId/live` mantienen el mismo contrato.

## Flujo real

### 1. Creacion de carrera

1. `RaceEngineService.createNextRace()` obtiene el siguiente video.
2. Crea la carrera `OPEN`.
3. `OddsEngineService.initializeForRace()` crea las 156 selecciones en `RaceOdds`.
4. `VirtualOddsService.generateOdds(raceId)` genera probabilidades y publica `currentOdds`.
5. La carrera queda abierta con cuotas visibles antes del primer ticket.

### 2. Venta de ticket

1. El POS consulta `RaceOdds.currentOdds`.
2. El usuario compra.
3. `TicketsService.create()` persiste `TicketDetail.odds`.
4. `OddsEngineService.applyTicketDetails()` incrementa `RaceOdds.totalAmount`.
5. `currentOdds` no cambia.

### 3. Cierre de carrera

1. `OddsEngineService.finalizeRace()` copia `currentOdds` a `finalOdds`.
2. Settlement usa la cuota vendida en `TicketDetail.odds`.
3. No existe repricing post-apuesta.

## Algoritmo generador

### Semilla deterministica

La semilla se construye asi:

```text
{raceNumber}-{videoName}-{resultado}
```

Ejemplo:

```text
1358-video24-2-1-6
```

Se registra en logs:

```text
[VIRTUAL ODDS]
Race 1358
Seed: 1358-video24-2-1-6
```

Tambien se registra una auditoria extendida:

```text
[VIRTUAL ODDS GENERATED]
RaceId
RaceNumber
Seed
Probabilidades
Cuotas WINNER
```

### Plantilla base por carrera

Para cada carrera se genera una plantilla ordenada de 6 probabilidades usando un generador pseudoaleatorio deterministico derivado de la semilla.

Rangos:

- slot 1: `22%..28%`
- slot 2: `16%..21%`
- slot 3: `13%..17%`
- slot 4: `10%..13%`
- slot 5: `8%..11%`
- slot 6: resto

La plantilla se proyecta y renormaliza para cumplir:

- `Pmin = 8%`
- `Pmax = 28%`
- `ΣP = 100%`

### Sesgo por resultado real

La asignacion a los perros se hace con sesgo controlado usando el `resultado` del video:

- ganador real: prioridad a slots bajos `5, 6, 4`
- segundo lugar: prioridad a slots medios-bajos `4, 5, 3`
- tercer lugar: prioridad a slots medios `3, 4, 2`
- los otros tres perros reciben los slots restantes, incluyendo favoritos

Esto logra que:

- el ganador real no siempre aparezca como favorito
- la distribucion cambie en cada carrera
- las cuotas abran atractivas sin depender del dinero

## Formulas

### Probabilidad

```text
ΣP = 100%
8% <= P_i <= 28%
```

### WINNER

```text
odds = 0.90 / P
```

### EXACTA

```text
P(A-B) = P(A) * (P(B) / (1 - P(A)))
odds = 0.85 / P(A-B)
```

### TRIFECTA

```text
P(A-B-C) =
P(A)
*
(P(B) / (1 - P(A)))
*
(P(C) / (1 - P(A) - P(B)))

odds = 0.80 / P(A-B-C)
```

### Redondeo

- Todas las cuotas se redondean a `4` decimales antes de publicar en `RaceOdds.currentOdds`.

## Impacto sobre RaceOdds

### Lo que se mantiene

- `RaceOdds.currentOdds` sigue siendo la cuota viva publicada.
- `RaceOdds.totalAmount` sigue almacenando dinero apostado por seleccion.
- `RaceOdds.finalOdds` sigue congelando el valor final al cerrar la carrera.
- La estructura de `RaceOdds` no cambia.

### Lo que cambia

- `currentOdds` ya no se calcula con `pool / selectionAmount`.
- `currentOdds` nace desde `VirtualOddsService`.
- `totalAmount` deja de ser input de pricing.

## Backward compatibility

No se rompe:

- `GET /odds/race/:raceId`
- `GET /odds/race/:raceId/live`
- `Ticket`
- `TicketDetail`
- `Settlement`
- `TicketPrint`
- POS frontend

El contrato JSON sigue igual porque:

- `getRaceOdds()` sigue devolviendo `finalOdds ?? currentOdds`
- `getRaceOddsLive()` sigue devolviendo las mismas columnas de `RaceOdds`
- `TicketDetail.odds` sigue almacenando la cuota vendida

## Configuracion de riesgo

Se agregan variables de entorno para validaciones futuras, sin activarlas todavia:

- `MAX_WINNER_STAKE`
- `MAX_EXACTA_STAKE`
- `MAX_TRIFECTA_STAKE`

Estado actual:

- solo se registran en configuracion global
- no bloquean ventas
- quedan listas para una fase posterior de validacion de stake

## Simulacion validada

Sobre `100` carreras reales consecutivas se valido el modelo implementado.

Resultados agregados:

- `WINNER`
  - cuota minima: `3.2143`
  - cuota maxima: `11.2103`
  - cuota promedio: `6.0822`
- `EXACTA`
  - cuota minima: `9.6267`
  - cuota maxima: `93.4847`
  - cuota promedio: `32.1349`
- `TRIFECTA`
  - cuota minima: `26.7526`
  - cuota maxima: `492.2052`
  - cuota promedio: `134.1062`

Validaciones matematicas:

- `ΣP = 100%` en todas las carreras simuladas
- minimo global observado: `8.0284%`
- maximo global observado: `28.0000%`
- solo `1` carrera toco el techo maximo

Conclusiones de la simulacion:

- no hay inflacion estructural
- ningun perro queda permanentemente favorito
- ningun perro queda permanentemente descartado
- el mercado abre con mejor diferenciacion comercial que el modelo DogRating

## Archivos implicados en la implementacion

- `src/modules/odds/virtual-odds.service.ts`
- `src/modules/odds/odds.module.ts`
- `src/modules/race-engine/race-engine.service.ts`
- `src/modules/odds/odds-engine/odds-engine.service.ts`
- `src/config/configuration.ts`
- `src/config/env.validation.ts`

## Rollback

Si el pricing virtual necesita rollback:

1. quitar la llamada a `VirtualOddsService.generateOdds()` en `RaceEngineService`
2. restaurar la logica de repricing en `OddsEngineService.applyTicketDetails()`
3. mantener `RaceOdds` y `TicketDetail` sin cambios

Garantias:

- los tickets emitidos no se rompen porque settlement usa `TicketDetail.odds`
- el contrato de endpoints de odds sigue estable
- no hay migraciones destructivas asociadas a este cambio

## Riesgos detectados

- el modelo depende de una semilla basada en datos internos de la carrera, por lo que conviene auditar acceso a logs y a resultados
- `TRIFECTA` puede abrir cuotas altas; conviene activar limites de stake en una siguiente fase
- si el generador falla antes de publicar cuotas, la carrera podria quedar con `currentOdds = 1`; por eso la generacion se ejecuta dentro del flujo de creacion de carrera

## Recomendacion operativa

Despues del despliegue:

- monitorear logs `[VIRTUAL ODDS]` y `[VIRTUAL ODDS GENERATED]`
- revisar cuotas de apertura en produccion
- preparar la siguiente fase de limites por stake usando la configuracion ya agregada
- maximo `28%`

Algoritmo propuesto:

1. Calcular `P_i` por rating.
2. Detectar probabilidades fuera de rango.
3. Recortar las que salgan de `[0.08, 0.28]`.
4. Redistribuir el exceso o deficit entre las restantes en proporcion a sus probabilidades originales.
5. Repetir hasta que todas queden dentro de rango.
6. Renormalizar para que `ΣP = 1`.

En el ejemplo anterior no hace falta recorte porque todas caen dentro de rango.

### 3. Cuota WINNER

Margen de banca:

- `10%`

Formula:

```text
oddsWinner_i = 0.90 / P_i
```

Redondeo:

- `4` decimales

Ejemplo con las probabilidades anteriores:

```text
P1 = 0.186441 -> odds = 0.90 / 0.186441 = 4.8273
P2 = 0.176271 -> odds = 5.1058
P3 = 0.166102 -> odds = 5.4184
P4 = 0.164407 -> odds = 5.4742
P5 = 0.155932 -> odds = 5.7717
P6 = 0.150847 -> odds = 5.9663
```

### 4. Probabilidad EXACTA

Generar 30 combinaciones:

```text
P(A-B) = P(A) * [P(B) / (1 - P(A))]
```

Margen:

- `15%`

Cuota:

```text
oddsExacta(A-B) = 0.85 / P(A-B)
```

Ejemplos:

```text
P(1-2) = 0.186441 * (0.176271 / (1 - 0.186441))
       = 0.040415
odds   = 0.85 / 0.040415
       = 21.0318

P(1-3) = 0.186441 * (0.166102 / 0.813559)
       = 0.038084
odds   = 22.3190
```

### 5. Probabilidad TRIFECTA

Generar 120 combinaciones:

```text
P(A-B-C) =
P(A)
*
[P(B) / (1 - P(A))]
*
[P(C) / (1 - P(A) - P(B))]
```

Margen:

- `20%`

Cuota:

```text
oddsTrifecta(A-B-C) = 0.80 / P(A-B-C)
```

Ejemplos:

```text
P(1-2-3) =
0.186441
*
(0.176271 / 0.813559)
*
(0.166102 / (1 - 0.186441 - 0.176271))
= 0.009106

odds = 0.80 / 0.009106 = 87.8553

P(1-3-2) =
0.186441
*
(0.166102 / 0.813559)
*
(0.176271 / (1 - 0.186441 - 0.166102))
= 0.009126

odds = 87.6656
```

## Actualizacion de ratings

### Momento de actualizacion

Despues de settlement exitoso de una carrera terminada.

Punto natural de integracion:

- [race-settlement.service.ts](file:///c:/Users/mauer/OneDrive/Desktop/APPS/mbraces/MBSPORT/dog-racing-backend/src/modules/race-settlement/race-settlement.service.ts#L9-L74)

### Regla aprobada

Usando `race.resultado`:

- Primer lugar:
  - `rating += 30`
  - `wins += 1`
- Segundo lugar:
  - `rating += 10`
  - `seconds += 1`
- Tercer lugar:
  - `rating += 5`
  - `thirds += 1`
- Ultimos tres perros:
  - `rating -= 10`

Limites:

- nunca menor que `500`
- nunca mayor que `2000`

### Ejemplo

Estado antes:

```text
P1 = 1000
P2 = 1000
P3 = 1000
P4 = 1000
P5 = 1000
P6 = 1000
```

Resultado de carrera:

```text
4-1-6
```

Estado despues:

```text
P4 = 1030
P1 = 1010
P6 = 1005
P2 =  990
P3 =  990
P5 =  990
```

Siguiente carrera:

- usa estos ratings actualizados
- por tanto `Perro 4` baja cuota
- `Perro 2`, `3` y `5` suben cuota

## Comportamiento de `RaceOdds`

### Lo que se mantiene

- `RaceOdds` sigue siendo la tabla publica del mercado. Ver [schema.prisma](file:///c:/Users/mauer/OneDrive/Desktop/APPS/mbraces/MBSPORT/dog-racing-backend/prisma/schema.prisma#L181-L197).
- `totalAmount` se conserva para observabilidad y exposicion.
- `finalOdds` puede seguir congelandose al cerrar.

### Lo que cambia

- `currentOdds` deja de ser resultado de `pool / amount`.
- `currentOdds` pasa a ser cuota fija generada por `VirtualOddsService`.
- `totalAmount` ya no debe modificar `currentOdds`.

## Cambios tecnicos requeridos

### Base de datos

- Agregar nueva tabla `DogRating`
- Crear migracion de bootstrap de 6 registros

### Backend

- Crear `VirtualOddsService`
- Integrar `VirtualOddsService.generateOdds(raceId)` en el flujo de creacion de carrera
- Modificar `OddsEngineService` para deshabilitar el repricing parimutuel
- Mantener incremento de `RaceOdds.totalAmount`
- Actualizar ratings despues de settlement

### Frontend/POS

No deberia requerir cambios si hoy consume:

- `RaceOdds.currentOdds`
- `TicketDetail.odds`

No fue posible inspeccionar el frontend directamente porque no esta presente en este workspace.

## Estrategia de migracion

### Fase A - Preparacion

- Crear tabla `DogRating`
- Bootstrap inicial de perros `1..6`
- Crear `VirtualOddsService`

### Fase B - Publicacion dual controlada

- `initializeForRace()` sigue creando las 156 selecciones
- `VirtualOddsService` publica `currentOdds`
- `applyTicketDetails()` solo incrementa `totalAmount`

### Fase C - Activacion completa

- `currentOdds` deja de depender totalmente del dinero
- Settlement sigue intacto
- Ratings se actualizan al terminar cada carrera

## Compatibilidad con settlement

Compatibilidad alta:

- `TicketDetail.odds` ya guarda la cuota vendida. Ver [schema.prisma](file:///c:/Users/mauer/OneDrive/Desktop/APPS/mbraces/MBSPORT/dog-racing-backend/prisma/schema.prisma#L166-L179).
- Settlement ya paga usando `amount * odds`. Ver [race-settlement.service.ts](file:///c:/Users/mauer/OneDrive/Desktop/APPS/mbraces/MBSPORT/dog-racing-backend/src/modules/race-settlement/race-settlement.service.ts#L127-L140).

Por tanto:

- no es necesario cambiar `Ticket`
- no es necesario cambiar `TicketDetail`
- no es necesario cambiar `Settlement`
- no es necesario cambiar `POS` por contrato, salvo validaciones visuales

## Riesgos

### Riesgos funcionales

- El primer arranque con `rating = 1000` genera cuotas uniformes.
- La diferenciacion aparece progresivamente conforme corren carreras y se actualizan ratings.

### Riesgos operativos

- El backend conoce el resultado del video antes de abrir la carrera.
- Debe mantenerse control interno fuerte para evitar uso indebido de esa informacion.

### Riesgos financieros

- Al pasar a cuotas fijas, la banca asume riesgo de precio.
- Aunque el pricing no se mueva por apuestas, la exposicion puede concentrarse en una seleccion.
- Por eso conviene conservar `RaceOdds.totalAmount` como metrica de riesgo.

### Riesgos tecnicos

- Si `applyTicketDetails()` se desactiva completamente sin conservar el incremento de `totalAmount`, se pierde trazabilidad de exposicion.
- Si `VirtualOddsService` falla al crear carrera, el mercado podria quedar con `currentOdds = 1`; esto debe evitarse con validaciones transaccionales.

## Plan de rollback

### Escenario de rollback rapido

Si el nuevo pricing presenta problemas:

1. Desactivar la llamada a `VirtualOddsService.generateOdds()`.
2. Restaurar el flujo actual de `applyTicketDetails()` como pricing.
3. Mantener `DogRating` en base de datos sin usarlo.
4. Las carreras ya vendidas no se afectan porque settlement usa `TicketDetail.odds`.

### Garantia de rollback

- Los tickets emitidos no dependen del motor futuro.
- El pago historico no se rompe porque la cuota vendida ya queda persistida en `TicketDetail`.

## Recomendacion final

La Fase 5 es tecnicamente viable y tiene una ventaja clara:

- permite cuotas visibles antes de apostar
- elimina la dependencia del dinero como fuente de precio
- reutiliza `RaceOdds` y settlement sin rediseñar el dominio de tickets

Puntos de atencion antes de implementar:

- aceptar que el motor partira uniforme y aprendera por ratings
- conservar `RaceOdds.totalAmount` para riesgo aunque no altere precio
- introducir `VirtualOddsService` como unica fuente de `currentOdds`

Recomendacion de aprobacion:

- aprobar esta arquitectura
- implementar en una fase posterior exactamente sobre estos puntos
- no cambiar `TicketDetail`, `Ticket`, `POS` ni settlement en la primera iteracion
