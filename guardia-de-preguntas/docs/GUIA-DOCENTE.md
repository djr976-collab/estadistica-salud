# Guía para docentes — Guardia de Preguntas

## 1. Qué es y qué no es
- Es un juego de **práctica y recuperación activa** para PP2: el estudiante decide, recibe el fundamento y vuelve sobre lo que le costó.
- **No es una evaluación acreditable.** Los puntos y las insignias no son una nota ni certifican competencia clínica presencial.
- **No hay seguimiento centralizado.** Cada estudiante guarda sus datos en su propio celular. Para ver resultados, pedí que exporten el **CSV** o copien el **informe** desde «Resumen de aprendizaje».

## 2. Estado del contenido (importante)
Todo el banco está en estado `draft`: fue redactado con asistencia de IA y **ningún docente lo revisó todavía**. El juego lo muestra en cada pregunta («Borrador · pendiente de revisión docente») y solo permite el **modo demostración**.

Las fuentes citadas existen y se verificaron por búsqueda (OMS, OPS, CDC, AHA, IHI, AHRQ, KDIGO, ADA, INS, IASP). Falta que la cátedra confirme que el apartado citado respalda cada afirmación. Los libros (Guyton y Hall, Goodman & Gilman, Potter & Perry) figuran sin edición: completala con la disponible en la biblioteca. La fuente «Protocolo institucional vigente» es un marcador que hay que reemplazar por el protocolo local.

## 3. Cómo revisar y aprobar preguntas
Los contenidos están en `src/content/`:

| Archivo | Contenido |
|---|---|
| `questions.json` | 36 preguntas base de PP2 y variantes de recuperación (`isRecoveryVariant: true`) |
| `subjects.json` | Las 8 materias del «Repaso por materia»: nombre, color, temas y regla de la insignia |
| `subjects/mat-*.json` | 20 preguntas por materia (cada una con `topic`, el tema dentro de la materia) |
| `final-challenge.json` | Caso integrador y sus 3 decisiones |
| `categories.json` | Categorías, colores, nombres de insignias y temas |
| `sources.json` | Catálogo de fuentes |
| `config.json` | Puntaje, reglas de insignia, espaciado del repaso, docente guardián y emblema |

Para cada pregunta, revisá: consigna, opciones, `correctOptionId`, devolución de cada opción (`feedback`), `rationale`, `transferPrinciple`, `riskNote` (si es crítica), fuentes y apartados.

Estados de `reviewStatus`:
- `draft`: borrador (estado actual).
- `reviewed`: revisada por una persona, pendiente de aprobación.
- `approved`: aprobada por la cátedra. **Solo estas aparecen en modo académico.**

Si querés dejar constancia, agregá `"reviewNote": "Revisó: [cargo], [fecha]"`. **No marques `approved` sin una revisión humana real.**

El **modo académico** se habilita solo si cada categoría tiene al menos 3 preguntas aprobadas y las 3 decisiones del desafío final están aprobadas.

Después de editar, ejecutá:
```powershell
npm run validate:content
npm run build
```
La validación rechaza: IDs duplicados, clave inexistente, opciones sin devolución, críticas sin variante, cálculos que no coinciden con el recálculo independiente, «todas las anteriores», y que la opción correcta sea la más larga en más del 40 % de las preguntas.

## 4. Cómo agregar preguntas
- Copiá una pregunta del mismo tipo y cambiá el `id` (único y estable: no lo reutilices).
- `conceptId` agrupa preguntas equivalentes. Una variante nueva con el mismo `conceptId` se usa automáticamente en «Repasar mis errores».
- Las preguntas críticas (`criticalSafety: true`) necesitan `riskNote` y `recoveryQuestionId` que apunte a una variante con el mismo `conceptId` y `isRecoveryVariant: true`.
- Los cálculos necesitan `unit`, `tolerance`, `rounding` y `numericCheck` (fórmula y datos) para el recálculo independiente. Usá datos ficticios y no introduzcas diluciones, dosis o velocidades presentadas como universales.
- Las fórmulas disponibles en `numericCheck` son: `volumen_dosis`, `conversion_mg_mcg`, `goteo`, `velocidad_bomba`, `balance`, `pam`.

## 5. Personalizar
- **Docente guardián:** `config.json → guardian` (nombre, título y frases). Usá solo nombres y frases autorizados; no representes a docentes reales sin consentimiento.
- **Emblema institucional:** copiá la imagen autorizada en `public/` (por ejemplo, `public/emblema.png`) y escribí `"emblem": { "src": "./emblema.png", ... }`. Agregá el archivo a la lista `publicFiles` de `vite.config.ts` para que quede disponible sin conexión.
- **Puntaje y reglas:** `config.json → points`, `recoveryFactor`, `completion`.

## 6. Sugerencia de uso en clase
1. **Antes:** publicá el juego (ver README) y pedí que lo abran una vez con wifi, hasta ver «Preparación sin conexión completa».
2. **Durante (20-30 min):** juego individual o en parejas. Pedí que, ante cada error, lean en voz alta el «Principio para llevarte».
3. **Cierre (10 min):** que exporten o copien el informe. Trabajá en plenario los **errores críticos** y las recomendaciones más repetidas.
4. Usá el caso final como disparador de un ejercicio SBAR oral.
