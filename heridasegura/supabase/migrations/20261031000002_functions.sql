-- =====================================================================
-- Migración 0002: funciones de seguridad, reglas clínicas, auditoría y RPC
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones auxiliares de autorización (SECURITY DEFINER para evitar
-- recursión de RLS; search_path fijo por seguridad).
-- ---------------------------------------------------------------------
create or replace function app_current_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function app_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app_current_role() = 'admin', false)
$$;

create or replace function app_is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select app_current_role() is not null
$$;

create or replace function app_has_sector(p_sector uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or (app_is_active_user() and exists (
            select 1 from user_sectors us where us.profile_id = auth.uid() and us.sector_id = p_sector))
$$;

-- Acceso a un paciente: administrador; o el paciente estuvo/está asignado a un
-- puesto de un sector autorizado; o fue registrado por el usuario y aún no
-- tiene ubicación (alta administrativa previa a la asignación de cama).
create or replace function app_can_access_patient(p_patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or (app_is_active_user() and (
            exists (
              select 1
              from bed_assignments ba
              join locations l on l.id = ba.location_id
              join user_sectors us on us.sector_id = l.sector_id and us.profile_id = auth.uid()
              where ba.patient_id = p_patient)
         or exists (
              select 1 from patients p
              where p.id = p_patient and p.created_by = auth.uid()
                and not exists (select 1 from bed_assignments ba2 where ba2.patient_id = p.id))
      ))
$$;

create or replace function app_can_write_clinical()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app_current_role() in ('admin', 'enfermero', 'supervisor'), false)
$$;

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create or replace function trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','services','sectors','rooms','locations','patients','admissions','wounds']
  loop
    execute format('create trigger set_updated_at before update on %I for each row execute function trg_set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Auditoría genérica (solo nombres de campos modificados, sin valores clínicos)
-- ---------------------------------------------------------------------
create or replace function trg_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fields text[];
  v_id text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_fields
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if v_fields is null then return new; end if;
  end if;
  v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key');
  insert into audit_logs (actor_id, action, table_name, record_id, changed_fields)
  values (auth.uid(), tg_op, tg_table_name, v_id, v_fields);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_sectors','services','sectors','rooms','locations','patients','admissions',
    'bed_assignments','wounds','wound_assessments','assessment_addenda','wound_photos',
    'braden_assessments','nursing_interventions','ai_models','ai_assessments','system_settings']
  loop
    execute format('create trigger audit_changes after insert or update or delete on %I for each row execute function trg_audit()', t);
  end loop;
end $$;

-- Registro explícito de accesos relevantes (visualización de ficha, exportaciones, fotos).
create or replace function log_access(p_action text, p_table text, p_record text, p_context jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not app_is_active_user() then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
  if p_action not in ('ACCESS', 'EXPORT', 'PHOTO_VIEW', 'REPORT', 'LOGIN', 'LOGOUT') then
    raise exception 'Acción de auditoría no permitida';
  end if;
  insert into audit_logs (actor_id, action, table_name, record_id, context)
  values (auth.uid(), p_action, p_table, p_record, coalesce(p_context, '{}'::jsonb) - 'value' - 'data');
end $$;

-- ---------------------------------------------------------------------
-- Inmutabilidad de registros clínicos confirmados
-- ---------------------------------------------------------------------
create or replace function trg_block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Los registros clínicos confirmados no pueden modificarse ni eliminarse. Utilice una adenda trazable.'
    using errcode = 'P0001';
end $$;

-- Valoraciones: solo se permite registrar la revisión del supervisor.
create or replace function trg_assessment_update_guard()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'supervisor_reviewed_by' - 'supervisor_reviewed_at')
     is distinct from (to_jsonb(old) - 'supervisor_reviewed_by' - 'supervisor_reviewed_at') then
    raise exception 'Las valoraciones confirmadas no pueden modificarse. Utilice una adenda trazable.'
      using errcode = 'P0001';
  end if;
  if old.supervisor_reviewed_by is not null then
    raise exception 'La valoración ya fue revisada.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger assessment_update_guard before update on wound_assessments
  for each row execute function trg_assessment_update_guard();
create trigger assessment_no_delete before delete on wound_assessments
  for each row execute function trg_block_mutation();

do $$
declare t text;
begin
  foreach t in array array['assessment_addenda','braden_assessments','nursing_interventions','bed_assignments_delete','wound_photos','audit_logs']
  loop
    if t = 'bed_assignments_delete' then
      execute 'create trigger no_delete before delete on bed_assignments for each row execute function trg_block_mutation()';
    else
      execute format('create trigger no_update_delete before update or delete on %I for each row execute function trg_block_mutation()', t);
    end if;
  end loop;
end $$;

create trigger no_delete before delete on wounds for each row execute function trg_block_mutation();
create trigger no_delete before delete on admissions for each row execute function trg_block_mutation();
create trigger no_delete before delete on patients for each row execute function trg_block_mutation();

-- ---------------------------------------------------------------------
-- Reglas de clasificación de lesiones por presión (NPIAP/EPUAP/PPPIA)
-- ---------------------------------------------------------------------
-- Gravedad para impedir la estadificación inversa.
create or replace function pu_rank(c pu_category)
returns int language sql immutable as $$
  select case c
    when 'estadio_1'       then 1
    when 'estadio_2'       then 2
    when 'tejido_profundo' then 2   -- puede evolucionar a 3, 4 o no clasificable
    when 'no_clasificable' then 3   -- al desbridarse se revela 3 o 4
    when 'estadio_3'       then 3
    when 'estadio_4'       then 4
    else null end
$$;

-- Devuelve NULL si la transición es válida o un mensaje de error.
create or replace function pu_transition_error(prev pu_category, nxt pu_category)
returns text language sql immutable as $$
  select case
    when prev is null or nxt is null or prev = nxt then null
    when prev = 'membrana_mucosa' or nxt = 'membrana_mucosa'
      then 'Las lesiones de membrana mucosa no se estadifican; no pueden cambiar a una categoría por estadios.'
    when prev = 'no_clasificable' and nxt in ('estadio_3', 'estadio_4') then null
    when prev = 'no_clasificable'
      then 'Una LPP no clasificable solo puede reclasificarse como estadio 3 o 4 cuando se visualiza el lecho.'
    when prev = 'tejido_profundo' and nxt in ('estadio_3', 'estadio_4', 'no_clasificable') then null
    when prev = 'tejido_profundo'
      then 'Una lesión de tejido profundo solo puede evolucionar a estadio 3, 4 o no clasificable.'
    when nxt = 'tejido_profundo' and prev in ('estadio_1') then null
    when pu_rank(nxt) < pu_rank(prev) or (prev in ('estadio_3','estadio_4') and nxt = 'tejido_profundo')
      then 'No se utiliza estadificación inversa: conserve la categoría de mayor gravedad y documente la evolución (p. ej., "estadio 4 en cicatrización"). Si hubo un error de clasificación, regístrelo mediante adenda.'
    else null end
$$;

create or replace function trg_assessment_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  w wounds%rowtype;
  v_err text;
begin
  select * into w from wounds where id = new.wound_id for update;
  if not found then raise exception 'Lesión inexistente'; end if;
  new.patient_id := w.patient_id;

  if w.etiology <> 'lesion_por_presion' and new.pu_category is not null then
    raise exception 'Los estadios de lesión por presión no se aplican a heridas de otra etiología.' using errcode = 'P0001';
  end if;

  if w.etiology = 'lesion_por_presion' and new.pu_category is not null and not new.classification_confirmed then
    raise exception 'La categoría de LPP debe ser confirmada por el profesional que valoró presencialmente.' using errcode = 'P0001';
  end if;

  if new.pu_category = 'estadio_1' and new.blanching <> 'no_blanqueable' then
    raise exception 'El estadio 1 requiere constatar eritema no blanqueable mediante exploración presencial.' using errcode = 'P0001';
  end if;

  if w.status <> 'activa' then
    raise exception 'La lesión está cerrada (%). Reabra mediante un nuevo registro o adenda.', w.status using errcode = 'P0001';
  end if;

  v_err := pu_transition_error(w.current_pu_category, new.pu_category);
  if v_err is not null then
    raise exception '%', v_err using errcode = 'P0001';
  end if;

  if new.assessed_by is distinct from auth.uid() and auth.uid() is not null then
    raise exception 'La valoración debe registrarse a nombre del profesional autenticado.' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger assessment_rules before insert on wound_assessments
  for each row execute function trg_assessment_rules();

-- Tras confirmar una valoración: fija categoría inicial, avanza la actual y
-- registra cierre si se documenta resolución o derivación (confirmación clínica).
create or replace function trg_assessment_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update wounds set
    initial_pu_category = coalesce(initial_pu_category, new.pu_category),
    current_pu_category = coalesce(new.pu_category, current_pu_category),
    status = case new.evolution when 'resuelta' then 'resuelta'::wound_status
                                when 'derivada' then 'derivada'::wound_status
                                else status end,
    closed_at = case when new.evolution in ('resuelta', 'derivada') then new.assessed_at else closed_at end,
    closed_by = case when new.evolution in ('resuelta', 'derivada') then new.assessed_by else closed_by end
  where id = new.wound_id;
  return new;
end $$;

create trigger assessment_after after insert on wound_assessments
  for each row execute function trg_assessment_after();

-- Protección de campos de lesión que solo derivan de valoraciones.
create or replace function trg_wound_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.initial_pu_category := null;
    new.current_pu_category := null;
    if new.admission_id is null then
      select id into new.admission_id from admissions where patient_id = new.patient_id and discharged_at is null;
    end if;
    return new;
  end if;
  -- Los cambios de categoría solo los hace el trigger de valoración (pg_trigger_depth > 1).
  if pg_trigger_depth() <= 1 and (
       new.initial_pu_category is distinct from old.initial_pu_category
    or new.current_pu_category is distinct from old.current_pu_category
    or new.patient_id is distinct from old.patient_id
    or new.etiology is distinct from old.etiology) then
    raise exception 'Etiología, paciente y categoría de una lesión no se modifican directamente. Registre una valoración o adenda.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger wound_guard before insert or update on wounds
  for each row execute function trg_wound_guard();

-- Denormalización segura de patient_id en tablas hijas.
create or replace function trg_fill_patient_from_wound()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.wound_id is not null then
    select patient_id into new.patient_id from wounds where id = new.wound_id;
  end if;
  return new;
end $$;

create trigger fill_patient before insert on wound_photos
  for each row execute function trg_fill_patient_from_wound();
create trigger fill_patient before insert on nursing_interventions
  for each row execute function trg_fill_patient_from_wound();
create trigger fill_patient before insert on ai_assessments
  for each row execute function trg_fill_patient_from_wound();

create or replace function trg_fill_admission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.admission_id is null then
    select id into new.admission_id from admissions where patient_id = new.patient_id and discharged_at is null;
  end if;
  return new;
end $$;

create trigger fill_admission before insert on braden_assessments
  for each row execute function trg_fill_admission();
create trigger fill_admission before insert on nursing_interventions
  for each row execute function trg_fill_admission();

-- Las inferencias de IA solo pueden provenir de modelos validados.
create or replace function trg_ai_model_validated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ai_models where id = new.model_id and validation_status = 'validado') then
    raise exception 'Solo se admiten inferencias de modelos con validación clínica y técnica aprobada.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger ai_model_validated before insert on ai_assessments
  for each row execute function trg_ai_model_validated();

-- ---------------------------------------------------------------------
-- RPC: movimientos de internación (atómicos, con validaciones)
-- ---------------------------------------------------------------------
create or replace function admit_patient(
  p_patient uuid, p_location uuid, p_admitted_at timestamptz default now(),
  p_diagnosis text default null, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  l locations%rowtype;
  v_adm uuid;
begin
  if not app_can_write_clinical() then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
  select * into l from locations where id = p_location for update;
  if not found or not l.active then raise exception 'Ubicación inexistente o inactiva'; end if;
  if not app_has_sector(l.sector_id) then
    raise exception 'No tiene permisos sobre el sector de la ubicación' using errcode = '42501';
  end if;
  if not (app_can_access_patient(p_patient)) then
    raise exception 'No tiene acceso a este paciente' using errcode = '42501';
  end if;
  if l.operational_status <> 'disponible' then
    raise exception 'La ubicación está % y no admite asignaciones', l.operational_status;
  end if;
  if exists (select 1 from bed_assignments where location_id = p_location and ended_at is null) then
    raise exception 'La ubicación ya está ocupada por otro paciente';
  end if;
  if exists (select 1 from admissions where patient_id = p_patient and discharged_at is null) then
    raise exception 'El paciente ya tiene un episodio de internación abierto. Use traslado o cambio de cama.';
  end if;

  insert into admissions (patient_id, admitted_at, admission_diagnosis, created_by)
  values (p_patient, p_admitted_at, p_diagnosis, auth.uid())
  returning id into v_adm;

  insert into bed_assignments (admission_id, patient_id, location_id, movement, started_at, notes, created_by)
  values (v_adm, p_patient, p_location, 'ingreso', p_admitted_at, p_notes, auth.uid());

  return v_adm;
end $$;

create or replace function move_patient(
  p_admission uuid, p_location uuid, p_movement movement_type default 'cambio_cama',
  p_at timestamptz default now(), p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a admissions%rowtype;
  cur bed_assignments%rowtype;
  l locations%rowtype;
  v_new uuid;
begin
  if not app_can_write_clinical() then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
  if p_movement = 'ingreso' then raise exception 'Use admit_patient para ingresos'; end if;
  select * into a from admissions where id = p_admission for update;
  if not found or a.discharged_at is not null then raise exception 'Episodio inexistente o cerrado'; end if;
  if not app_can_access_patient(a.patient_id) then
    raise exception 'No tiene acceso a este paciente' using errcode = '42501';
  end if;
  select * into l from locations where id = p_location for update;
  if not found or not l.active then raise exception 'Ubicación inexistente o inactiva'; end if;
  if not app_has_sector(l.sector_id) and not app_is_admin() then
    -- Un traslado a otro sector lo puede registrar el sector de origen.
    if p_movement <> 'traslado' then
      raise exception 'No tiene permisos sobre el sector de destino' using errcode = '42501';
    end if;
  end if;
  if l.operational_status <> 'disponible' then
    raise exception 'La ubicación de destino está % y no admite asignaciones', l.operational_status;
  end if;
  select * into cur from bed_assignments where admission_id = p_admission and ended_at is null for update;
  if cur.id is not null and cur.location_id = p_location then raise exception 'El paciente ya se encuentra en esa ubicación'; end if;
  if exists (select 1 from bed_assignments where location_id = p_location and ended_at is null) then
    raise exception 'La ubicación de destino ya está ocupada';
  end if;
  if cur.id is not null and p_at < cur.started_at then raise exception 'La fecha del movimiento es anterior a la asignación vigente'; end if;

  if cur.id is not null then
    update bed_assignments set ended_at = p_at where id = cur.id;
  end if;
  insert into bed_assignments (admission_id, patient_id, location_id, movement, started_at, notes, created_by)
  values (p_admission, a.patient_id, p_location, p_movement, p_at, p_notes, auth.uid())
  returning id into v_new;
  return v_new;
end $$;

create or replace function discharge_patient(
  p_admission uuid, p_status admission_status default 'alta',
  p_at timestamptz default now(), p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a admissions%rowtype;
begin
  if not app_can_write_clinical() then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
  if p_status = 'internado' then raise exception 'Estado de egreso inválido'; end if;
  select * into a from admissions where id = p_admission for update;
  if not found or a.discharged_at is not null then raise exception 'Episodio inexistente o ya cerrado'; end if;
  if not app_can_access_patient(a.patient_id) then
    raise exception 'No tiene acceso a este paciente' using errcode = '42501';
  end if;
  if p_at < a.admitted_at then raise exception 'La fecha de egreso es anterior al ingreso'; end if;
  update bed_assignments set ended_at = p_at where admission_id = p_admission and ended_at is null;
  update admissions set status = p_status, discharged_at = p_at, discharge_notes = p_notes where id = p_admission;
end $$;

-- ---------------------------------------------------------------------
-- Alta automática de perfil al crear un usuario en Supabase Auth.
-- El perfil nace INACTIVO y como 'enfermero': el administrador lo habilita
-- y asigna rol y sectores (evita escalamiento por metadatos del cliente).
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role, active)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), 'enfermero', false)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Un usuario no puede cambiar su propio rol ni activarse.
create or replace function trg_profile_guard()
returns trigger language plpgsql as $$
begin
  if not app_is_admin() and auth.uid() is not null
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Solo un administrador puede modificar rol o estado del usuario' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profile_guard before update on profiles
  for each row execute function trg_profile_guard();

-- ---------------------------------------------------------------------
-- Vista de ocupación (respeta RLS de las tablas base: security_invoker)
-- ---------------------------------------------------------------------
create or replace view location_occupancy with (security_invoker = true) as
select
  l.id as location_id,
  l.sector_id,
  l.room_id,
  l.code,
  l.location_type,
  l.operational_status,
  l.active,
  ba.id as assignment_id,
  ba.admission_id,
  ba.patient_id,
  ba.started_at,
  case
    when ba.id is not null then 'ocupada'
    when l.operational_status = 'disponible' then 'libre'
    else l.operational_status::text
  end as display_status
from locations l
left join bed_assignments ba on ba.location_id = l.id and ba.ended_at is null;
