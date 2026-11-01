# Guía paso a paso: publicar HeridaSegura IA (versión de prueba)

> Tiempo estimado: 15 minutos. Solo **pacientes ficticios** hasta la autorización institucional.

## Estado actual (ya hecho)
- Base de datos Supabase **heridasegura-ia** creada en **São Paulo** (plan gratuito).
- Migraciones 0001 a 0010 aplicadas: 157 puestos, RLS, reglas clínicas, auditoría, depósito de fotos **privado**.
- Pacientes ficticios de demostración cargados (incluida la cama 30B de CQ Sector 4).
- Verificado en la base real: permisos por sector, una cama/un paciente, sin estadificación inversa, auditoría restringida.

---

## Parte A — Supabase (5 minutos)
Entrar a https://supabase.com/dashboard → proyecto **heridasegura-ia**.

**A1. Cerrar el registro libre de usuarios**
*Authentication → Sign In / Providers → Email*: dejar **Email** habilitado y **desactivar "Allow new users to sign up"**. Guardar.
(Los usuarios los crea administración desde la app.)

**A2. Crear su usuario administrador**
*Authentication → Users → Add user → Create new user*: su correo + una contraseña segura (mínimo 10 caracteres), marcar **Auto Confirm User**.
Después avise a Claude el correo usado para habilitarlo como administrador (o ejecute `scripts/promote-admin.sql` en *SQL Editor* reemplazando el correo).

**A3. Copiar la clave secreta (NO compartirla por chat)**
*Project Settings → API Keys*: copiar la **secret key** (`sb_secret_…`; en proyectos antiguos se llama `service_role`). Se pega solo en Netlify (paso B3).

---

## Parte B — Netlify (10 minutos)
**B1.** Entrar a https://app.netlify.com con su cuenta de GitHub → **Add new site → Import an existing project → GitHub** → elegir **djr976-collab/estadistica-salud** (autorizar el acceso si lo pide).

**B2. Configuración de compilación**
| Campo | Valor |
|---|---|
| Branch to deploy | `main` (si ya se integró el código) o `ccr-26be9b1b-8ct0qx` |
| Base directory | `heridasegura` |
| Build command | `npm run build` |
| Publish directory | `heridasegura/.next` |

**B3. Variables de entorno** (*Add environment variables*, antes de desplegar)
| Clave | Valor | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eyuuvnwncicoitbddcem.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave pública `sb_publishable_…` (Supabase → API Keys → Publishable key) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | la clave secreta del paso A3 | **Sí** (marcar *Contains secret values*) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | No |

**B4.** **Deploy**. Esperar 2–4 minutos hasta *Published*.

**B5. Verificar**: abrir `https://SU-SITIO.netlify.app/api/health` → debe mostrar `"supabase":true,"serviceKey":true`.

**B6. Nombre del sitio** (opcional): *Site configuration → Change site name* → por ejemplo `heridasegura-hesm`.

---

## Parte C — Conectar ambos (2 minutos)
**C1.** Supabase → *Authentication → URL Configuration* → **Site URL** = `https://SU-SITIO.netlify.app` → Guardar.

**C2.** Ingresar a la app con el usuario administrador → *Administración → Usuarios → Nuevo usuario*: crear una cuenta de enfermería (sector CQ Sector 4) y otra de supervisión.

**C3. Prueba de aceptación** (con el usuario de enfermería, desde el celular)
1. Camas → Clínica Quirúrgica — Sector 4 → Habitación 30 → **30B** → Abrir ficha.
2. Registrar lesión → valoración con foto → confirmar.
3. Ver evolución. Instalar en el celular: menú del navegador → *Agregar a pantalla de inicio*.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| La app muestra "DEMO · datos ficticios" | Faltan las variables `NEXT_PUBLIC_…` o se cargaron después del deploy → *Deploys → Trigger deploy* |
| "Usuario pendiente de habilitación" | Falta el paso A2 (habilitar administrador) |
| No se pueden crear usuarios desde la app | Falta `SUPABASE_SERVICE_ROLE_KEY` en Netlify |
| Error al compilar en Netlify | Verificar *Base directory* = `heridasegura` |
