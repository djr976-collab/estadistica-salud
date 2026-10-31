# Manual del administrador — HeridaSegura IA

## Usuarios y permisos
| Rol | Puede |
|---|---|
| Administrador/a | Todo: usuarios, estructura, configuración, auditoría, todos los sectores |
| Coordinación / supervisión | Consultar y registrar en sus sectores, revisar valoraciones, bloquear/habilitar camas de sus sectores, reportes y exportación anonimizada |
| Profesional de enfermería | Pacientes, lesiones, fotos, valoraciones, Braden e intervenciones de sus sectores; adendas |

- **Alta:** *Administración → Usuarios → Nuevo usuario* (correo, contraseña inicial ≥ 10 caracteres, rol, sectores). Se crea desde el servidor.
- **Baja:** desmarque *Usuario activo* (no elimine: preserva la trazabilidad). Un usuario inactivo pierde acceso inmediatamente por RLS.
- Revise trimestralmente usuarios y sectores asignados (principio de mínimo privilegio).

## Estructura hospitalaria
*Administración → Estructura hospitalaria*.
- Jerarquía: Hospital → Servicio → Sector → Habitación/Área → Cama/Puesto.
- Puede **agregar, renombrar, recodificar, reordenar y desactivar** sin perder información clínica: los registros referencian identificadores internos.
- **No elimine**: desactive. No se puede desactivar una ubicación ocupada.
- Tipos de puesto: cama de internación, cama UTI, box UTI, cama coronaria, shockroom, observación, camilla. Shockroom, observación y camillas **no cuentan como camas de internación** en los indicadores.
- Códigos **provisorios** (UTI-C01…, UTI-BOX01…, EMG-SHK-01…, EMG-OBS-01…, EMG-CAM-01…, UCO-C01…): reemplácelos por la nomenclatura institucional y desmarque *Código provisorio*.
- La carga inicial (`seed_hospital_structure()`) es **idempotente**: si se ejecuta otra vez no duplica ni sobrescribe sus cambios.

Estructura precargada (153 puestos): CM S1 hab. 1–8 (A/B) 16 · CM S2 hab. 9–16 (A/B/C) 24 · CQ S3 hab. 18–27 (A/B) 20 · CQ S4 hab. 28–33 (A/B/C), 34–35 (A–D), 38–39 (A/B) 30 · Sector 6 hab. 601–610 (A/B) 20 · UTI 13 camas + 5 boxes · Emergencias 4 shockroom + 8 observación + 4 camillas · Unidad Coronaria 9.

## Configuración
- Vigencia de Braden, intervalo sugerido de reevaluación, duración de URL firmadas, base legal de fotografías.
- **Asistencia de IA:** solo se puede habilitar si existe un modelo con validación aprobada (bloqueado por la app y la base).
- **Datos reales:** dejar desactivado hasta contar con el acto administrativo de autorización.

## Auditoría
Registra altas, modificaciones (nombres de campos, no valores clínicos), accesos a fichas y fotos, exportaciones, inicios/cierres de sesión, gestión de usuarios. Es de solo lectura y no puede borrarse desde la base.

## Incorporación futura de IA (Fase 3)
1. Registrar el modelo en `ai_models` con informe de validación (`validation_ref`), responsable y fecha de aprobación.
2. Si procesa fuera de la institución: acuerdo de tratamiento de datos (`dpa_reference`) e imágenes sin identificadores.
3. Implementar `WoundVisionProvider` (`src/lib/ai/provider.ts`) en el servidor e insertar inferencias con la clave de servicio.
4. Piloto supervisado, evaluación de desempeño y sesgos (incluidos fototipos), y monitoreo continuo.
