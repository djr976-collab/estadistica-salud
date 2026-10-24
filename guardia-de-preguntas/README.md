# Guardia de Preguntas

**Poné en juego lo que sabés. Fundamentá cómo cuidás.**

Juego web de preguntas y desafíos para estudiantes de 2.º año de Enfermería (Práctica Profesional II). Está diseñado primero para celulares, funciona sin conexión una vez preparado y guarda el progreso solo en el dispositivo.

> **Estado del contenido:** las 36 preguntas, sus 9 variantes de recuperación y el desafío final son **borradores generados con asistencia de IA**. Están marcados `draft` y pendientes de revisión docente. Por eso el juego funciona en **modo demostración**, y el **modo académico** queda bloqueado hasta que la cátedra apruebe contenido. Ver [docs/GUIA-DOCENTE.md](docs/GUIA-DOCENTE.md).

---

## 1. Ejecutarlo en Windows

### Requisitos
1. Instalá **Node.js 20 o superior** (versión LTS) desde <https://nodejs.org>. En el instalador dejá marcada la opción que agrega Node al PATH.
2. Abrí **PowerShell** o **Símbolo del sistema** y comprobá la instalación:
   ```powershell
   node -v
   npm -v
   ```

### Instalación (una sola vez)
```powershell
cd ruta\a\estadistica-salud\guardia-de-preguntas
npm install
```

### Desarrollo (para probar cambios)
```powershell
npm run dev
```
Abrí la dirección que aparece (por ejemplo, `http://localhost:5173`). Para probarlo desde un celular **en la misma red wifi**, usá la dirección «Network» que muestra la consola (por ejemplo, `http://192.168.0.10:5173`). En desarrollo **no** se prepara el modo sin conexión.

### Pruebas y compilación
```powershell
npm test                 # reglas del juego, banco de contenidos, CSV y guardado (41 pruebas)
npm run validate:content # solo valida el banco de preguntas
npm run typecheck        # verificación de tipos TypeScript
npm run build            # valida el contenido, compila y genera la carpeta dist\
npm run preview          # sirve dist\ en http://localhost:4173 para probar la versión final
```

Verificación visual automatizada (opcional, requiere Playwright con Chromium: `npm i -D playwright` y `npx playwright install chromium`):
```powershell
npm run build
npm run verify:ui        # 73 a 75 comprobaciones (según el sorteo) en 320, 360, 390 y 430 px; capturas en test-results\screens\
```

---

## 2. Publicarlo con HTTPS

El uso sin conexión y la instalación como app **requieren HTTPS** (salvo en `localhost`). La carpeta `dist\` es un sitio estático: no necesita servidor propio ni base de datos. Funciona en una subcarpeta, porque usa rutas relativas.

**Opción A — Netlify (la más simple)**
1. Ejecutá `npm run build`.
2. Entrá a <https://app.netlify.com/drop> y arrastrá la carpeta `dist`.
3. Netlify te da una dirección `https://…netlify.app`.

**Opción B — GitHub Pages**
1. Ejecutá `npm run build`.
2. Publicá el contenido de `dist/` en la rama o carpeta configurada para Pages (por ejemplo, con la acción oficial `actions/deploy-pages`).
3. La dirección queda como `https://usuario.github.io/repositorio/…`.

**Opción C — Vercel, Cloudflare Pages o el servidor institucional**: subí `dist/` como sitio estático. Si es un servidor propio, configurá HTTPS y servila con los tipos MIME estándar.

**Al publicar una versión nueva:** volvé a compilar y reemplazá `dist/` completa. El juego detecta la versión nueva y muestra «Hay una versión nueva del juego · Actualizar ahora». El progreso de los estudiantes **no se borra** al actualizar, porque vive en IndexedDB, separado de la caché.

---

## 3. Abrirlo o instalarlo en el celular

Primero abrilo **una vez con conexión** y esperá a que en el inicio aparezca *«Preparación sin conexión completa»*. Después probá abrirlo en **modo avión** antes de la clase.

### Android (Chrome)
1. Abrí la dirección `https://…` en Chrome.
2. Menú ⋮ → **Instalar aplicación** (o **Agregar a la pantalla principal**).
3. Se abre como app, sin barra del navegador.

### iPhone (Safari)
1. Abrí la dirección en **Safari** (en iOS, la instalación solo funciona desde Safari).
2. Botón **Compartir** → **Agregar a pantalla de inicio**.
3. iOS puede borrar los datos de sitios que no se usan durante semanas. Para conservar los resultados, conviene **exportar el CSV** al terminar.

> Si el inicio muestra *«Este navegador no permite guardar datos»* (por ejemplo, en navegación privada), el juego funciona, pero el progreso se pierde al cerrar.

---

## 4. Funciones implementadas

**Fase 1 — Juego individual «Mi guardia»**
- Alias opcional (sin datos personales) y 4 avatares propios: chaqueta de ambo blanca, pantalón rojo, calzado cerrado, sin cofia, con espacio para el emblema institucional (`config.json → emblem.src`).
- Ruleta SVG de 6 categorías. El resultado se decide **antes** de animar y la ruleta se detiene exactamente en ese sector. Bloquea giros simultáneos, equilibra categorías, permite como máximo 2 seguidas iguales, excluye y marca (rayado) las categorías sin preguntas nuevas, y nunca cambia de categoría en silencio.
- Opción accesible **«Elegir desafío sin animación»**. Con movimiento reducido no se anima.
- Una pregunta por pantalla: la consigna queda fija mientras se elige, las opciones se mezclan conservando ID, clave y devoluciones, y se confirma con un botón para evitar toques accidentales.
- Tipos: opción única, caso breve, error de seguridad y cálculo numérico (unidad explícita, regla de redondeo, tolerancia, coma o punto, rechazo de vacíos, texto y unidades, botón ± para el signo).
- Devolución completa: qué elegiste, la mejor respuesta, por qué, por qué tu opción no lo era, devoluciones de las demás opciones (sin penalización), principio trasladable, fuentes y estado de revisión.
- **Seguridad del paciente:** ante una acción insegura en una pregunta crítica aparece «Acción detenida», se explica el riesgo y se ofrece una instancia de recuperación con una variante distinta. El concepto queda pendiente y **bloquea la insignia y el desafío final**: ningún puntaje lo compensa.
- Puntos configurables (10/20/30; la mitad tras recuperación; sin bonus por rapidez). Distingue acierto en primer intento, acierto tras recuperación, pendiente y pregunta ya vista.
- Insignias por categoría: 3 preguntas distintas, al menos una de aplicación y sin críticas pendientes. Celebración breve (sin confeti si hay movimiento reducido).
- **«La última pregunta de la guardia»:** un caso único con 3 decisiones encadenadas (reconocer → actuar con seguridad → comunicar y registrar) y recuperación dentro del caso. El docente guardián es provisional y reemplazable.
- Resumen de aprendizaje con denominadores explícitos, críticos y su estado, pendientes y recomendaciones basadas en los errores. Copiar el informe y exportar CSV (UTF-8 con BOM, separador `;`, comillas y saltos de línea escapados, neutralización de fórmulas).
- Guardado continuo (IndexedDB → localStorage → memoria, con aviso), pausa y continuación tras cerrar, reinicio con confirmación.

**Fase 2 (parcial) — Repasar mis errores**
- Los conceptos con error vuelven con una **pregunta equivalente** cuando existe. Si no, se repite la misma y se indica *«el banco todavía no tiene otra variante»*. El repaso se espacia: los no críticos se habilitan después de 2 respuestas.

**Fase 3 (parcial) — Distribución**
- PWA con manifest e íconos. El Service Worker se genera en la compilación con la lista exacta de recursos. La app **comprueba contra la caché** que cada recurso esté guardado antes de decir «completa». Las actualizaciones se ofrecen y no se aplican por sorpresa.

## 5. Verificaciones realizadas

| Verificación | Cómo | Resultado |
|---|---|---|
| Reglas del juego (ruleta, mezcla, cálculos, críticos, compensación, insignias, repaso, puntaje, recorrido completo al final) | `npm test` (Vitest) | 41/41 |
| Banco: IDs, claves, variantes, fuentes, distribución, pistas por extensión, cálculo independiente | `npm run validate:content` | sin errores |
| 320/360/390/430 px: sin desplazamiento horizontal, objetivos ≥ 48 px, la ruleta coincide con la categoría, la consigna sigue visible y elegir no desplaza | `npm run verify:ui` (Chromium) | OK |
| Recorrido completo por la interfaz hasta el desafío final, con error crítico y recuperación | `verify:ui` | OK |
| Teclado, validación numérica en la interfaz, persistencia tras recargar, reinicio confirmado, CSV | `verify:ui` | OK |
| Inicio y juego **sin conexión** con el Service Worker real (emulación offline de Chromium) | `verify:ui` | OK |
| Actualización de versión conservando la pregunta en curso | `verify:ui` | OK |

**Requieren un teléfono físico (no se pudieron probar acá):** instalación real en Android e iPhone, modo avión real, Safari de iOS (gestos, teclado decimal, áreas seguras con muesca), lectores de pantalla (TalkBack y VoiceOver), sonido en dispositivos reales y rendimiento en equipos de gama baja.

## 6. Pendientes y límites reales
- **Contenido:** todo en borrador. Falta la revisión y aprobación docente, ajustar las ediciones de los libros, reemplazar el «protocolo institucional» genérico por el protocolo local y confirmar los apartados citados.
- **Banco:** 36 preguntas base (objetivo: 180). Solo las 9 críticas tienen variante equivalente; el resto se repite en el repaso, avisándolo. Temas sin cobertura todavía: reconstitución y dilución, bombas de infusión, curaciones (parcial), preparación de materiales, sistema nervioso.
- **Duelo local:** no implementado (aparece como «próxima etapa»). No hay ni se ofrece juego en línea.
- **Tipos futuros:** ordenamiento, asociación, selección sobre imagen y respuesta breve (sin corrección automática) están previstos en el esquema, pero sin interfaz.
- **Sin panel docente ni seguimiento centralizado:** los datos quedan en cada celular. El docente recibe los resultados solo si el estudiante exporta o comparte el CSV o el informe.
- Los puntos e insignias **no son una nota académica ni certifican competencia clínica**.

## 7. Estructura

```
guardia-de-preguntas/
├─ src/
│  ├─ content/        banco en JSON (questions, final-challenge, categories, sources, config) + carga y validación
│  ├─ engine/         rng, wheel (geometría), evaluate (respuestas), game (selección, recuperación, progreso), summary
│  ├─ persistence/    IndexedDB con alternativas
│  ├─ export/         CSV seguro
│  ├─ pwa/            registro y verificación offline + plantilla del Service Worker
│  └─ ui/             pantallas, componentes, íconos y avatares SVG propios, sonidos sintetizados
├─ tests/             pruebas automatizadas (Vitest)
├─ scripts/           verify-ui.mjs (Playwright), make-icons.mjs
└─ docs/GUIA-DOCENTE.md
```
