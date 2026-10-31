# Estado de implementación (MVP)

## Implementado y verificado
| Módulo | Estado | Verificación |
|---|---|---|
| Esquema SQL normalizado, FK, índices, restricciones | ✅ | Pruebas SQL |
| Carga hospitalaria idempotente (153 puestos) | ✅ | SQL + unitarias + e2e |
| RLS por rol y sector, Storage privado | ✅ | Pruebas SQL (stub local de auth/storage) |
| Autenticación (Supabase Auth) y roles | ✅ código · ⚙ requiere proyecto | Modo demo probado e2e |
| Plano de camas jerárquico, estados, bloqueo | ✅ | e2e |
| Pacientes, ingreso, cambio de cama, traslado, egreso con historial | ✅ | SQL + e2e |
| Lesiones con esquema corporal, etiologías, origen verificable | ✅ | e2e |
| Valoración estructurada + clasificación NPIAP con reglas | ✅ | unitarias + SQL + e2e |
| Fotografía: cámara/carga, calidad, rotar/recortar, calibración, original preservado | ✅ | unitarias + e2e |
| Línea de tiempo, gráfico de superficie (comparabilidad), comparación lado a lado, zoom | ✅ | e2e |
| Adendas trazables, revisión de supervisión | ✅ | SQL |
| Braden (6 dimensiones), historial y gráfico | ✅ | unitarias + e2e |
| Intervenciones con cumplimiento | ✅ | — |
| Alertas de reevaluación (no diagnósticas) | ✅ | unitarias |
| Dashboard de indicadores con filtros y advertencias | ✅ | unitarias + e2e |
| PDF (lesión, paciente, sector, Braden, indicadores) y Excel (indicadores, anonimizado) | ✅ | compilación; generación manual |
| Auditoría | ✅ | SQL |
| PWA instalable, modo oscuro, responsive, accesibilidad básica | ✅ | e2e (capturas) |

## Requiere configuración
- Proyecto Supabase (migraciones, primer administrador) y variables en Netlify — ver `DESPLIEGUE.md`.
- Las pruebas SQL usan un stub de `auth`/`storage`; conviene repetirlas sobre un proyecto Supabase de prueba.

## IA — NO validada
- No hay modelo registrado ni validado. La app opera en **valoración manual asistida** y **no simula** resultados.
- El control de calidad de imagen es una **heurística local determinista**, no IA.
- Arquitectura lista: `ai_models`, `ai_assessments` (solo modelos validados), `src/lib/ai/provider.ts`.

## Limitaciones conocidas / próximos pasos (Fase 2–3)
- Los indicadores se calculan en el cliente: para volúmenes altos, migrar a vistas/funciones SQL.
- Superficie = largo × ancho (aproximación rectangular); planimetría por segmentación pendiente.
- Sin trabajo offline con sincronización (decisión deliberada de privacidad).
- MFA, firma digital, notificaciones push y gestión de consentimiento: pendientes institucionales.
- `exceljs` arrastra dependencias con avisos de `npm audit` de severidad moderada (solo usadas al leer archivos ZIP; la app solo escribe).
