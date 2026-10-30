# ¡NO, CARAJO! — Academia de Enfermería

Juego educativo para estudiantes de enfermería con un instructor virtual animado, **El Jefe de Guardia**, que pregunta en voz alta, escucha por micrófono, corrige, explica cada error y reacciona con humor argentino. El humor siempre apunta al error, nunca a la persona.

> **Principio pedagógico:** el estudiante puede reírse de su error, pero nunca termina una pregunta sin comprender por qué se equivocó.
>
> Simulador educativo: no reemplaza la supervisión clínica real, la indicación médica ni los protocolos institucionales. El banco de preguntas debe ser revisado por el equipo docente y contrastado con la normativa local antes de su uso institucional.

---

## 1. Qué incluye esta versión (prototipo funcional)

| Funcionalidad | Estado |
|---|---|
| Bienvenida, modalidad, módulo (12), personalidad, dificultad, cantidad de preguntas, modo oral/escrito | ✅ |
| Jefe de Guardia animado (SVG original): reposo, habla, festejo, mano en la frente, sorpresa, alarma con sirena, pensando | ✅ |
| Síntesis de voz (prioriza voz `es-AR`) y reconocimiento de voz (`es-AR`), con alternativa escrita o por botones | ✅ |
| 41 preguntas iniciales: opción múltiple, V/F, abiertas, cálculos y un caso clínico progresivo | ✅ |
| Modalidades: **Duelo**, **Guardia** (caso progresivo), **Código rojo** (contrarreloj), **Examen final** (sin pistas ni reintento), **Revancha** (tus errores, reformulados) | ✅ |
| 3 personalidades; «sin filtro» exige confirmación +18 y el docente puede desactivarlo | ✅ |
| Error grave de seguridad: alerta roja, simulación detenida, explicación del riesgo y **pregunta de recuperación obligatoria** | ✅ |
| Corrección con pista y segundo intento antes de mostrar la explicación | ✅ |
| Cálculos de dosis y goteo **deterministas** (nunca por IA), con detección de errores de unidades y números nuevos en Revancha | ✅ |
| Corrección de abiertas por conceptos clave y sinónimos, tolerante a errores de dictado | ✅ |
| XP que premia el razonamiento, 6 niveles, 10 insignias, rachas, estadísticas por módulo, errores frecuentes y recomendaciones | ✅ |
| Panel docente: banco, editor, importación CSV/Excel, borradores de IA con revisión, resultados, exportación CSV/PDF, interruptor del lenguaje fuerte | ✅ (PIN demo, almacenamiento local) |
| **Demo sin API externa** | ✅ |
| IA opcional (Claude) **sólo desde el servidor**, con límites por IP y por día | ✅ |
| PWA instalable, con juego sin conexión usando el banco local | ✅ |
| Efectos de sonido originales sintetizados con Web Audio (sin archivos con derechos de autor) | ✅ |

---

## 2. Estructura de carpetas

```
no-carajo/
├── public/
│   ├── manifest.webmanifest        # PWA
│   ├── sw.js                       # Service worker (modo sin conexión)
│   └── icons/                      # Íconos 192/512/maskable + SVG
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Tipografía, metadatos, PWA
│   │   ├── page.tsx                # Juego
│   │   ├── globals.css             # Tema neón + animaciones del personaje
│   │   ├── docente/page.tsx        # Panel docente
│   │   └── api/ai/
│   │       ├── status/route.ts     # ¿Hay IA? ¿Cuántas llamadas quedan hoy?
│   │       ├── evaluate/route.ts   # Corrección de abiertas con IA
│   │       └── generate/route.ts   # Borradores de preguntas (docente)
│   ├── components/
│   │   ├── Jefe.tsx                # Personaje animado
│   │   ├── Game.tsx                # Flujo de pantallas + barra superior
│   │   ├── Setup.tsx               # Opciones de juego
│   │   ├── Play.tsx                # Motor de juego (preguntas, voz, temporizador, errores graves)
│   │   ├── Summary.tsx             # Resumen final
│   │   ├── Stats.tsx               # Progreso del estudiante
│   │   └── PwaRegister.tsx
│   ├── data/
│   │   ├── modules.ts              # Los 12 módulos
│   │   └── questions.ts            # Banco oficial inicial (editable)
│   └── lib/
│       ├── types.ts
│       ├── engine/
│       │   ├── calc.ts             # Motor determinista de cálculos
│       │   ├── grade.ts            # Corrección local (MC, V/F, abiertas, cálculos)
│       │   ├── text.ts             # Normalización, números hablados, coincidencia aproximada
│       │   ├── session.ts          # Arma la sesión según la modalidad
│       │   └── *.test.ts           # Pruebas
│       ├── personality.ts          # Frases del Jefe (reglas editoriales)
│       ├── speech.ts               # Voz (TTS/STT) con alternativas
│       ├── sfx.ts                  # Sonidos originales (Web Audio)
│       ├── progress.ts             # XP, niveles, insignias, recomendaciones
│       ├── settings.ts             # Configuración docente y banco local
│       ├── csv.ts                  # Importar/exportar CSV (compatible con Excel)
│       ├── ai-client.ts            # Llamadas del navegador a /api/ai
│       └── server/                 # Sólo servidor (clave de API, límites)
├── supabase/schema.sql             # Fase 2: cuentas, roles, RLS, estadísticas grupales
├── .env.example
└── netlify.toml
```

---

## 3. Ejecutar localmente

Requisito: **Node.js 20 o superior** (recomendado 22).

```bash
cd no-carajo
npm install
cp .env.example .env.local     # opcional: funciona sin tocar nada (modo DEMO)
npm run dev
```

Abrí <http://localhost:3000>. Para probar en tu teléfono Android dentro de la misma red Wi-Fi:

```bash
npm run dev -- -H 0.0.0.0
# en el teléfono: http://<ip-de-tu-pc>:3000
```

> El micrófono y la instalación como app requieren **HTTPS** (o `localhost`); por red local el navegador puede bloquearlos. En Vercel o Netlify ya viene con HTTPS.

Otros comandos:

```bash
npm test          # pruebas de cálculos, números hablados y corrección
npm run typecheck
npm run build && npm start   # modo producción (activa el service worker sin conexión)
```

**Panel docente:** `/docente`, PIN demo `1234` (se cambia con `NEXT_PUBLIC_DEMO_ADMIN_PIN`). Este PIN **no** es seguridad real: es sólo para el prototipo.

---

## 4. Activar la IA real (opcional)

1. Creá una clave en <https://console.anthropic.com>.
2. En `.env.local` (local) o en las variables de entorno del hosting:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   AI_MODEL=claude-opus-5-5        # opción más económica: claude-haiku-5-5
   AI_DAILY_LIMIT=300
   AI_RATE_LIMIT_PER_IP=20
   ```
3. Reiniciá. La barra superior mostrará **IA ON** en lugar de **DEMO**.

Cómo se usa la IA:
- **Sólo desde el servidor**: la clave nunca llega al navegador.
- Evalúa el **razonamiento** de las respuestas abiertas (parcialmente correctas, sinónimos, errores de dictado frente a errores conceptuales) y devuelve una salida estructurada: veredicto, devolución, conceptos logrados y faltantes, y una pregunta de seguimiento.
- Genera **borradores de preguntas** en el panel docente. Quedan en una **cola de revisión** y sólo pasan al banco cuando un docente los aprueba. Se puede pegar bibliografía validada para que la IA la use como fuente principal.
- **No calcula dosis**: los cálculos siempre los resuelve `engine/calc.ts`.
- Si la IA falla, se queda sin cupo o no hay conexión, la corrección vuelve automáticamente al motor local.
- Control de costos: límite por IP, límite diario, tope de longitud de la respuesta enviada, esfuerzo de razonamiento bajo para corregir y uso de IA sólo en preguntas abiertas.
- Está activado el *fallback* del lado del servidor (`fallbacks: "default"`): si el modelo principal rechaza una solicitud, la API reintenta automáticamente con un modelo compatible.

---

## 5. Despliegue

### Opción A — Vercel (recomendada para Next.js)

1. Subí el repositorio a GitHub.
2. En <https://vercel.com/new>, importá el repo.
3. **Root Directory:** `no-carajo`. Vercel detecta Next.js solo.
4. *Environment Variables* (opcionales): `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_DAILY_LIMIT`, `AI_RATE_LIMIT_PER_IP`, `NEXT_PUBLIC_DEMO_ADMIN_PIN`, `NEXT_PUBLIC_ALLOW_SPICY`.
5. Deploy. Obtenés una URL HTTPS que se puede instalar como app en Android («Agregar a pantalla de inicio» / «Instalar app»).

### Opción B — Netlify

1. En <https://app.netlify.com>, elegí *Add new site → Import from Git*.
2. **Base directory:** `no-carajo`. El comando de build (`npm run build`) y la carpeta de publicación (`.next`) salen de `netlify.toml`. Netlify aplica su runtime de Next.js automáticamente, incluidas las rutas `/api`.
3. Cargá las mismas variables en *Site configuration → Environment variables*.
4. Deploy.

> En esta versión los límites de uso se guardan en memoria por instancia del servidor; en plataformas serverless son aproximados. Para un control estricto, mover el contador a la tabla `ai_usage` de Supabase (fase 2).

---

## 6. Contenidos y reglas editoriales

- **Banco oficial** en `src/data/questions.ts`. Cada pregunta tiene explicación y, cuando corresponde, una referencia con la aclaración «validar con protocolo local».
- **Cálculos:** en `calc.template`, con `base` y `variants`. El motor los resuelve, muestra los pasos y detecta errores de unidades.
- **Errores graves:** campo `critical`, con las opciones riesgosas, el riesgo para el paciente y la pregunta de recuperación.
- **Personalidad:** `src/lib/personality.ts`. El humor apunta al error o a la situación, nunca a la inteligencia, identidad, cuerpo u origen de la persona. Sin insultos discriminatorios, amenazas ni humillación. En errores graves el tono es siempre profesional, en todos los modos.

Formato CSV para importar (Excel → *Guardar como CSV UTF-8*; separador `,` o `;`). La plantilla se descarga desde el panel:

```
modulo;nivel;tipo;enunciado;opcion_a;opcion_b;opcion_c;opcion_d;correcta;explicacion;referencia;conceptos_clave
bioseguridad;basico;mcq;¿...?;...;...;...;...;A;Porque...;OMS;
signos;basico;vf;La FC normal es 60-100 lpm;;;;;V;...;;
pae;intermedio;abierta;¿Qué es un dato subjetivo?;;;;;;Lo que refiere...;;refiere|dice;paciente
```

---

## 7. Hoja de ruta (próximas fases)

1. **Cuentas y roles (Supabase Auth):** administrador, docente y estudiante. Aplicar `supabase/schema.sql` (ya incluye RLS: los resultados de cada estudiante son privados y sólo los ve su docente autorizado).
2. Pasar `settings.ts` y `progress.ts` de `localStorage` a Supabase. Las funciones ya están aisladas para eso.
3. Estadísticas grupales por curso (vista `course_module_stats`) y exportación Excel/PDF por curso.
4. Registro de uso de IA por usuario (`ai_usage`) con cupos por curso.
5. Más casos clínicos para la modalidad Guardia y preguntas de seguimiento generadas por IA.
6. Repetición espaciada con fechas de repaso (SM-2) en Revancha.
