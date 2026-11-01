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
| 60 preguntas: opción múltiple, V/F, abiertas, cálculos y **7 casos clínicos progresivos** con monitor de signos vitales | ✅ |
| Modalidades: **Duelo**, **Guardia** (caso clínico a elección o al azar), **Código rojo** (contrarreloj), **Examen final** (sin pistas ni reintento), **Revancha** (tus errores, reformulados) | ✅ |
| 3 personalidades; «sin filtro» exige confirmación +18 y el docente puede desactivarlo | ✅ |
| Error grave de seguridad: alerta roja, simulación detenida, explicación del riesgo y **pregunta de recuperación obligatoria** | ✅ |
| Corrección con pista y segundo intento antes de mostrar la explicación | ✅ |
| Cálculos de dosis y goteo **deterministas** (nunca por IA), con detección de errores de unidades y números nuevos en Revancha | ✅ |
| Corrección de abiertas por conceptos clave y sinónimos, tolerante a errores de dictado | ✅ |
| XP que premia el razonamiento, 6 niveles, 10 insignias, rachas, estadísticas por módulo, errores frecuentes y recomendaciones | ✅ |
| **Cuentas de usuario** (Supabase): registro, ingreso, recuperación de contraseña, roles admin/docente/estudiante, cursos con código de inscripción | ✅ |
| Progreso sincronizado entre dispositivos, con cola sin conexión | ✅ |
| Panel docente: banco compartido, editor (incluye casos clínicos), importación CSV/Excel, borradores de IA con revisión, cursos, **resultados por curso y por estudiante**, exportación CSV/PDF, modo +18 por curso, gestión de roles (admin) | ✅ |
| Seguridad por filas (RLS) probada: cada estudiante ve sólo lo suyo; cada docente, sólo a sus estudiantes | ✅ |
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
│   │   ├── docente/page.tsx        # Panel docente (banco, cursos, resultados, usuarios)
│   │   ├── ingresar/page.tsx       # Ingreso, registro y recuperación de contraseña
│   │   ├── cuenta/page.tsx         # Perfil, inscripción a curso, cerrar sesión
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
│   │   ├── VitalsMonitor.tsx       # Monitor de signos vitales de los casos
│   │   └── PwaRegister.tsx
│   ├── data/
│   │   ├── modules.ts              # Los 12 módulos
│   │   ├── questions.ts            # Banco oficial (preguntas sueltas)
│   │   └── cases.ts                # Casos clínicos progresivos (modo Guardia)
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
│       ├── supabase.ts             # Cliente Supabase (sólo si está configurado)
│       ├── auth.tsx                # Sesión, perfil, curso, sincronización al ingresar
│       ├── cloud.ts                # Progreso, intentos (cola sin conexión), banco y consultas docentes
│       ├── teacher-store.ts        # Panel docente: misma interfaz en modo demo y con cuentas
│       └── server/                 # Sólo servidor (clave de API, límites)
├── supabase/
│   ├── schema.sql                  # Tablas, funciones, RLS y vistas (se ejecuta una vez)
│   └── tests/                      # Pruebas de seguridad por filas contra PostgreSQL local
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

**Panel docente en modo demo** (sin Supabase): `/docente`, PIN `1234` (se cambia con `NEXT_PUBLIC_DEMO_ADMIN_PIN`). Ese PIN **no** es seguridad real; con cuentas configuradas el panel exige rol docente.

---

## 3 bis. Activar las cuentas de usuario (Supabase)

Sin estas variables la app funciona en **modo demo** (todo en el dispositivo). Con ellas, cada estudiante tiene su cuenta y sus resultados quedan en la base de datos.

1. **Crear el proyecto:** en <https://supabase.com> → *New project* (el plan gratuito alcanza para empezar).
2. **Crear las tablas:** *SQL Editor* → *New query* → pegá todo el contenido de `supabase/schema.sql` → *Run*. Se ejecuta **una sola vez**.
3. **Configurar el correo de acceso:** *Authentication → URL Configuration*:
   - *Site URL*: la dirección pública de la app (p. ej., `https://no-carajo.vercel.app`).
   - *Redirect URLs*: agregá `https://TU-DOMINIO/cuenta` y, para pruebas locales, `http://localhost:3000/cuenta`.
   - Opcional: en *Authentication → Providers → Email* podés desactivar «Confirm email» para pruebas en clase (se recomienda dejarlo activo en producción).
4. **Variables de entorno** (local en `.env.local`, y también en Vercel/Netlify):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # Project Settings → API → clave pública (anon / publishable)
   ```
   No cargues la clave `service_role`: la app no la necesita y daría acceso total.
5. **Primer administrador:** registrate en la app con tu correo y luego ejecutá en el *SQL Editor*:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```
6. **Docentes:** cada docente se registra; desde *Panel docente → Usuarios* el admin le asigna el rol «Docente».
7. **Cursos:** el docente crea el curso en *Panel docente → Cursos* y comparte el **código de 6 caracteres**. Los estudiantes lo ingresan al registrarse o desde *Mi cuenta*.

### Qué ve cada rol

| Rol | Puede |
|---|---|
| Estudiante | Jugar, ver su propio progreso, inscribirse a un curso con código. Sus resultados son privados. |
| Docente | Todo lo anterior + gestionar el banco compartido, crear cursos, ver resultados **sólo de sus cursos**, decidir si su curso permite el modo +18. |
| Admin | Todo lo anterior para todos los cursos + asignar roles. |

### Cómo se protegen los datos
- Toda la seguridad está en la base de datos (*Row Level Security*). Aunque alguien modifique la app, no puede leer datos ajenos, cambiarse el rol ni cambiarse de curso sin código.
- Estas reglas tienen pruebas automáticas (`supabase/tests/`) que simulan un admin, dos docentes y dos estudiantes de cursos distintos: **28 comprobaciones**. Para correrlas con un PostgreSQL local: `PGHOST=… PGUSER=postgres ./supabase/tests/run-local.sh`.
- Sin conexión: las respuestas se guardan en una cola en el dispositivo y se envían solas al recuperar la conexión (sin duplicados).
- La IA exige sesión válida y descuenta de un cupo diario por usuario (`AI_USER_DAILY_LIMIT`). La generación de preguntas con IA queda restringida a docentes.
- Limitación conocida: el XP y las insignias los calcula el dispositivo del estudiante; para evaluación formal usá el desempeño por respuestas (tabla de intentos), no el XP.

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

## 7. Casos clínicos (modo Guardia)

| Caso | Módulo | Pasos | Qué entrena |
|---|---|---|---|
| Guardia nocturna: el postoperado «está raro» | Casos | 3 | Hipoxemia postoperatoria, prevención de atelectasias, SBAR |
| Madrugada en clínica médica: hipoglucemia | Signos vitales | 3 | Reconocer hipoglucemia, regla 15/15, prevención |
| Transfusión en curso: escalofríos | Seguridad | 3 | Reacción transfusional, trazabilidad, doble verificación |
| Primera dosis de antibiótico EV | Farmacología | 4 | Anafilaxia, primera línea, posición, notificación |
| Tercer día postoperatorio: fiebre y confusión | Urgencias | 3 | Sepsis (qSOFA), hemocultivos y antibiótico, perfusión |
| 03:00 h: adulto mayor desorientado | Seguridad | 3 | Delirium, causas reversibles, riesgo de caídas (Morse) |
| El suero «no baja» | Bioseguridad | 3 | Infiltración/extravasación, flebitis (Maddox/VIP), registro |

Cada paso puede mostrar un **monitor de signos vitales** que evoluciona con el caso. Los docentes pueden crear casos nuevos desde el editor (casilla «Es un paso de un caso clínico») o por CSV (columnas `caso_id`, `paso`, `titulo_caso`, `situacion`).

Las pruebas automáticas (`npm test`) verifican la integridad de todo el banco: respuestas válidas, que ninguna opción correcta esté marcada como error grave, que cada caso tenga pasos 1…N con título, y que la explicación modelo de cada pregunta abierta sea reconocida como correcta por el corrector.

---

## 8. Hoja de ruta

1. Revisión del banco y de los casos por el equipo docente y ajuste a protocolos locales.
2. Más casos clínicos (pediatría, obstetricia, salud mental) y ramificaciones según la decisión tomada.
3. Preguntas de seguimiento generadas por IA dentro de los casos.
4. Repetición espaciada con fechas de repaso (SM-2) en Revancha.
5. XP calculado en el servidor para usos evaluativos.
