# HeridaSegura IA

Aplicación web progresiva (PWA), mobile-first, para la **valoración y el seguimiento de heridas y lesiones por presión** por profesionales de enfermería. Diseñada inicialmente para el Hospital Escuela General José Francisco de San Martín (Corrientes, Argentina).

> **Principio rector:** la inteligencia artificial nunca sustituye el juicio clínico. En esta versión **no hay ningún modelo de IA validado**: la app funciona en *valoración manual asistida* y no simula resultados de IA.
>
> **Prototipo:** solo datos **ficticios** hasta la evaluación y autorización institucional (privacidad, seguridad y validación funcional).

## Inicio rápido (modo demostración, sin Supabase)

```bash
cd heridasegura
npm install
npm run dev          # http://localhost:3000
```
Sin variables de Supabase, la app arranca en **modo demo**: datos ficticios guardados solo en el navegador, con usuarios de prueba (contraseña `demo1234`). El flujo prioritario está disponible de inmediato: *Camas → Clínica Quirúrgica — Sector 4 → Habitación 30 → 30B → ficha → registrar lesión → valoración → evolución*.

## Arquitectura

| Capa | Tecnología |
|---|---|
| Interfaz | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · PWA (manifest + service worker sin caché de datos clínicos) |
| Datos | Supabase PostgreSQL con **Row Level Security** por rol y sector |
| Autenticación | Supabase Auth (correo + contraseña); perfiles nacen inactivos |
| Fotos | Supabase Storage **privado** (`wound-photos`) + URL firmadas de corta duración |
| Servidor | Ruta `/api/admin/users` (clave de servicio solo en servidor) · `/api/health` |
| Despliegue | Netlify (`@netlify/plugin-nextjs`) |

```
src/
  app/                 Pantallas (login, inicio, servicios, sectores, camas, pacientes, lesiones, indicadores, reportes, admin, guía)
  components/          UI accesible, esquema corporal, captura fotográfica, gráficos, panel de IA
  lib/
    clinical.ts        Reglas clínicas: NPIAP/EPUAP, transición de estadios, Braden, alertas
    indicators.ts      Prevalencia, incidencia, densidad, cobertura Braden, cumplimiento
    image-quality.ts   Control de calidad de imagen (heurístico local, no IA) y calibración
    hospital-structure.ts  Estructura inicial (espejo de la migración SQL)
    data/              Contrato Repo + SupabaseRepo + DemoRepo
    ai/provider.ts     Arquitectura para modelos validados (Fase 3, sin modelos registrados)
    export/            PDF (jsPDF) y Excel (ExcelJS), incluida exportación anonimizada
supabase/
  migrations/          0001 esquema · 0002 funciones/reglas/auditoría · 0003 RLS + Storage · 0004 carga hospitalaria · 0005 directorio/ocupación
  seed.sql             Pacientes ficticios de demostración
  tests/               Pruebas SQL (PostgreSQL local con stub de auth/storage)
```

## Pruebas

```bash
npm test              # 48 pruebas unitarias (reglas clínicas, Braden, indicadores, estructura, calidad de imagen)
npm run test:sql      # ~55 aserciones SQL: estructura, idempotencia, RLS, reglas clínicas, inmutabilidad
npm run build && npx next start -p 3100 & npm run test:e2e   # flujo completo en Chromium (viewport celular)
```

## Documentación

- [Despliegue en Supabase + Netlify](docs/DESPLIEGUE.md)
- [Manual de enfermería](docs/MANUAL_ENFERMERIA.md)
- [Manual del administrador](docs/MANUAL_ADMINISTRADOR.md)
- [Seguridad y privacidad](docs/SEGURIDAD_PRIVACIDAD.md)
- [Metodología de indicadores](docs/METODOLOGIA_INDICADORES.md)
- [Estado de implementación](docs/ESTADO_IMPLEMENTACION.md)
