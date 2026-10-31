# Seguridad y privacidad

> Diseño orientado a la Ley 25.326 (Protección de Datos Personales; datos de salud = datos sensibles) y la Ley 26.529 (Derechos del Paciente e Historia Clínica). **Debe validarse con el área legal y de sistemas** antes del uso clínico.

| Requisito | Implementación |
|---|---|
| Acceso por rol y sector | RLS en todas las tablas; funciones `app_can_access_patient`, `app_has_sector` (SECURITY DEFINER, `search_path` fijo) |
| Sin escalamiento de privilegios | Perfiles nacen **inactivos**; un usuario no puede cambiar su rol/estado (trigger); gestión de usuarios solo vía servidor |
| Ocupación sin identidad | `location_status_map()` informa ocupada/libre sin datos del paciente para sectores no autorizados |
| Integridad clínica | Valoraciones, adendas, Braden, intervenciones, fotos y auditoría **inmutables** (triggers); sin políticas DELETE; correcciones por adenda |
| Reglas clínicas en la base | Sin estadios en heridas no-LPP; estadio 1 exige no blanqueable; sin estadificación inversa; categoría solo con confirmación profesional |
| Una cama, un paciente | Índices únicos parciales + RPC transaccionales `admit_patient`, `move_patient`, `discharge_patient` |
| Fotos privadas | Bucket `wound-photos` privado, ruta `{paciente}/{lesión}/{uuid}`, políticas por acceso al paciente, sin UPDATE/DELETE; URL firmadas 15–300 s; hash SHA-256 de integridad; original preservado |
| Minimización en imágenes | Guía de toma, declaración obligatoria de ausencia de identificadores, recorte |
| IA | Solo inferencias de modelos `validado` (trigger); sin envío a terceros en esta versión |
| Auditoría | Triggers en todas las tablas + `log_access()` para accesos/exportaciones; **sin valores clínicos** en la auditoría |
| Secretos | Solo clave anon en el cliente; `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en `/api` |
| Transporte y cabeceras | HTTPS (Netlify/Supabase), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` |
| Sesión | Cierre por inactividad (20 min), limpieza de `sessionStorage` al salir |
| PWA | El service worker **no** almacena respuestas de API, datos ni fotos |
| Datos reales | Bloqueados por política RLS y trigger hasta habilitar `allow_real_patient_data` |
| Exportación anonimizada | Seudónimos aleatorios, franjas etarias, días relativos, sin texto libre ni fotos |

## Pendientes institucionales antes del uso con pacientes reales
1. Evaluación de impacto en privacidad y registro de la base de datos ante la autoridad de control, si corresponde.
2. Política de conservación, respaldo, restauración probada y eliminación.
3. Contrato/acuerdo con proveedores (Supabase/Netlify): ubicación de datos, subencargados, cifrado en reposo, notificación de incidentes.
4. Autenticación multifactor (Supabase MFA) y política de contraseñas.
5. Gestión de dispositivos (celulares institucionales o MDM); desactivar copia automática de fotos a la nube personal.
6. Consentimiento / información al paciente para fotografía clínica según normativa y protocolo institucional.
7. Firma electrónica/digital con validez legal si se pretende que los registros sustituyan a la historia clínica en papel.
8. Pruebas de penetración y revisión de Advisors de Supabase.
