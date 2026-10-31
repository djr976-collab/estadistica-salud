-- =====================================================================
-- Migración 0003: Row Level Security y Storage privado
-- Regla general: sin política = sin acceso. No existen políticas DELETE
-- sobre tablas clínicas (no se elimina silenciosamente información).
-- =====================================================================

alter table profiles              enable row level security;
alter table services              enable row level security;
alter table sectors               enable row level security;
alter table rooms                 enable row level security;
alter table locations             enable row level security;
alter table user_sectors          enable row level security;
alter table patients              enable row level security;
alter table admissions            enable row level security;
alter table bed_assignments       enable row level security;
alter table wounds                enable row level security;
alter table wound_assessments     enable row level security;
alter table assessment_addenda    enable row level security;
alter table wound_photos          enable row level security;
alter table braden_assessments    enable row level security;
alter table nursing_interventions enable row level security;
alter table ai_models             enable row level security;
alter table ai_assessments        enable row level security;
alter table audit_logs            enable row level security;
alter table system_settings       enable row level security;

-- ---------------- Perfiles ----------------
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or app_is_admin()
         or (app_current_role() = 'supervisor' and exists (
               select 1 from user_sectors a join user_sectors b on a.sector_id = b.sector_id
               where a.profile_id = auth.uid() and b.profile_id = profiles.id)));
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on profiles for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- ---------------- Estructura hospitalaria ----------------
-- Lectura para todo usuario activo (la estructura física no es dato de salud).
create policy services_read  on services  for select to authenticated using (app_is_active_user());
create policy sectors_read   on sectors   for select to authenticated using (app_is_active_user());
create policy rooms_read     on rooms     for select to authenticated using (app_is_active_user());
create policy locations_read on locations for select to authenticated using (app_is_active_user());

create policy services_admin  on services  for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy sectors_admin   on sectors   for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy rooms_admin     on rooms     for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy locations_admin on locations for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- Supervisores pueden bloquear/habilitar puestos de su sector (no estructura).
create policy locations_supervisor_status on locations for update to authenticated
  using (app_current_role() = 'supervisor' and app_has_sector(sector_id))
  with check (app_current_role() = 'supervisor' and app_has_sector(sector_id));

create policy user_sectors_read on user_sectors for select to authenticated
  using (profile_id = auth.uid() or app_is_admin());
create policy user_sectors_admin on user_sectors for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- ---------------- Pacientes y movimientos ----------------
create policy patients_select on patients for select to authenticated
  using (app_can_access_patient(id));
-- Mientras no exista autorización institucional, solo se admiten pacientes ficticios.
create policy patients_insert on patients for insert to authenticated
  with check (app_can_write_clinical() and created_by = auth.uid()
              and (is_fictitious or coalesce(
                    (select (value #>> '{}')::boolean from system_settings where key = 'allow_real_patient_data'), false)));
create policy patients_update on patients for update to authenticated
  using (app_can_access_patient(id) and app_can_write_clinical())
  with check (app_can_access_patient(id) and app_can_write_clinical());

create policy admissions_select on admissions for select to authenticated
  using (app_can_access_patient(patient_id));
-- Altas/movimientos solo mediante RPC (admit_patient, move_patient, discharge_patient).

create policy bed_assignments_select on bed_assignments for select to authenticated
  using (app_can_access_patient(patient_id));

-- ---------------- Lesiones y registros clínicos ----------------
create policy wounds_select on wounds for select to authenticated
  using (app_can_access_patient(patient_id));
create policy wounds_insert on wounds for insert to authenticated
  with check (app_can_write_clinical() and app_can_access_patient(patient_id) and created_by = auth.uid());
create policy wounds_update on wounds for update to authenticated
  using (app_can_write_clinical() and app_can_access_patient(patient_id))
  with check (app_can_write_clinical() and app_can_access_patient(patient_id));

create policy assessments_select on wound_assessments for select to authenticated
  using (app_can_access_patient(patient_id));
create policy assessments_insert on wound_assessments for insert to authenticated
  with check (app_can_write_clinical() and assessed_by = auth.uid()
              and app_can_access_patient((select w.patient_id from wounds w where w.id = wound_id)));
-- Revisión del supervisor (el trigger impide modificar el contenido clínico).
create policy assessments_supervisor_review on wound_assessments for update to authenticated
  using (app_current_role() in ('supervisor', 'admin') and app_can_access_patient(patient_id))
  with check (supervisor_reviewed_by = auth.uid());

create policy addenda_select on assessment_addenda for select to authenticated
  using (app_can_access_patient((select a.patient_id from wound_assessments a where a.id = assessment_id)));
create policy addenda_insert on assessment_addenda for insert to authenticated
  with check (author_id = auth.uid() and app_can_write_clinical()
              and app_can_access_patient((select a.patient_id from wound_assessments a where a.id = assessment_id)));

create policy photos_select on wound_photos for select to authenticated
  using (app_can_access_patient(patient_id));
create policy photos_insert on wound_photos for insert to authenticated
  with check (uploaded_by = auth.uid() and app_can_write_clinical()
              and app_can_access_patient((select w.patient_id from wounds w where w.id = wound_id)));

create policy braden_select on braden_assessments for select to authenticated
  using (app_can_access_patient(patient_id));
create policy braden_insert on braden_assessments for insert to authenticated
  with check (assessed_by = auth.uid() and app_can_write_clinical() and app_can_access_patient(patient_id));

create policy interventions_select on nursing_interventions for select to authenticated
  using (app_can_access_patient(patient_id));
create policy interventions_insert on nursing_interventions for insert to authenticated
  with check (performed_by = auth.uid() and app_can_write_clinical() and app_can_access_patient(patient_id));

-- ---------------- IA ----------------
create policy ai_models_read on ai_models for select to authenticated using (app_is_active_user());
create policy ai_models_admin on ai_models for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy ai_assessments_select on ai_assessments for select to authenticated
  using (app_can_access_patient(patient_id));
-- Las inferencias se insertan únicamente desde el servidor (service role) tras validación.

-- ---------------- Auditoría y configuración ----------------
create policy audit_admin_read on audit_logs for select to authenticated using (app_is_admin());
create policy settings_read on system_settings for select to authenticated using (app_is_active_user());
create policy settings_admin on system_settings for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- ---------------- Permisos de ejecución de funciones ----------------
revoke execute on function admit_patient(uuid, uuid, timestamptz, text, text) from public, anon;
revoke execute on function move_patient(uuid, uuid, movement_type, timestamptz, text) from public, anon;
revoke execute on function discharge_patient(uuid, admission_status, timestamptz, text) from public, anon;
revoke execute on function log_access(text, text, text, jsonb) from public, anon;
grant execute on function admit_patient(uuid, uuid, timestamptz, text, text) to authenticated;
grant execute on function move_patient(uuid, uuid, movement_type, timestamptz, text) to authenticated;
grant execute on function discharge_patient(uuid, admission_status, timestamptz, text) to authenticated;
grant execute on function log_access(text, text, text, jsonb) to authenticated;

-- ---------------- Storage privado de fotografías ----------------
-- Ruta obligatoria: {patient_id}/{wound_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wound-photos', 'wound-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy wound_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'wound-photos'
         and app_can_access_patient(((storage.foldername(name))[1])::uuid));

create policy wound_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'wound-photos'
              and app_can_write_clinical()
              and exists (select 1 from wounds w
                          where w.id = ((storage.foldername(name))[2])::uuid
                            and w.patient_id = ((storage.foldername(name))[1])::uuid)
              and app_can_access_patient(((storage.foldername(name))[1])::uuid));
-- Sin políticas UPDATE/DELETE: los originales se preservan.
