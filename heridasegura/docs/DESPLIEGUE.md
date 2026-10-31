# Despliegue: Supabase + Netlify

> Use primero un proyecto de **prueba**. No cargue datos reales hasta contar con la autorización institucional.

## 1. Supabase

1. Cree un proyecto en Supabase (región más cercana disponible; registre la ubicación de los datos para la evaluación de privacidad).
2. **Authentication → Providers → Email:** habilitado. **Desactive "Allow new users to sign up"** (los usuarios los crea administración).
3. **Authentication → Settings:** duración de sesión y *refresh token rotation* según política institucional.
4. Ejecute las migraciones **en orden** (SQL Editor o `supabase db push`):
   - `supabase/migrations/20261031000001_schema.sql`
   - `…0002_functions.sql`
   - `…0003_rls.sql` (crea el bucket privado `wound-photos` y sus políticas)
   - `…0004_seed_hospital.sql` (153 ubicaciones; idempotente)
   - `…0005_directory_occupancy.sql`
5. (Opcional, solo prueba) `supabase/seed.sql`: pacientes **ficticios**, incluido el de CQ Sector 4, habitación 30, cama B.
6. Cree el primer usuario en **Authentication → Users → Add user** y ejecute `scripts/promote-admin.sql` (reemplazando el correo).
7. Verifique en **Storage** que `wound-photos` figure como **privado**.
8. Revise **Advisors → Security** y corrija cualquier advertencia.

Con Supabase CLI:
```bash
supabase link --project-ref <ref>
supabase db push            # aplica supabase/migrations
psql "$DB_URL" -f supabase/seed.sql   # solo en prueba
```

## 2. Netlify

1. *Add new site → Import from Git* y elija el repositorio.
2. **Base directory:** `heridasegura` · **Build command:** `npm run build` · **Publish directory:** `.next` (lo define `netlify.toml`; el plugin `@netlify/plugin-nextjs` se instala automáticamente).
3. **Environment variables** (Site settings → Environment):
   | Variable | Valor | Ámbito |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Build + runtime |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave pública anon | Build + runtime |
   | `SUPABASE_SERVICE_ROLE_KEY` | clave de servicio | **Solo funciones** (nunca con prefijo `NEXT_PUBLIC_`) |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` | Build |
4. Despliegue. Verifique `https://<sitio>/api/health` → `{"supabase":true,"serviceKey":true}`.
5. En Supabase → Authentication → URL Configuration, agregue el dominio de Netlify como *Site URL*.

Sin variables de Supabase, el sitio se publica en **modo demostración** (útil para capacitación).

## 3. Verificación posterior

- Ingresar como administrador → *Administración → Usuarios*: crear enfermería y supervisión con sus sectores.
- Con un usuario de enfermería: Camas → CQ Sector 4 → 30B → ficha → registrar lesión → valoración con foto → evolución.
- Con un usuario de otro sector: comprobar que la cama 30B aparece ocupada **sin** identidad del paciente.
- *Administración → Auditoría*: verificar registros de accesos, altas y exportaciones.

## 4. Respaldo y recuperación

- Plan con *Point-in-Time Recovery* o backups diarios (según plan Supabase) + exportación periódica cifrada (`pg_dump`) custodiada por el área de sistemas.
- Storage: replicar el bucket con herramienta autorizada; documentar procedimiento de restauración y probarlo al menos semestralmente.
- La conservación y eliminación siguen la política institucional de historia clínica (Ley 26.529); no hay borrado desde la app.
