-- =====================================================================
-- Migración 0005: directorio de profesionales y ocupación sin datos personales
-- =====================================================================

-- Nombre y matrícula de profesionales activos (para mostrar quién valoró).
-- No expone rol, correo ni otros datos.
create or replace function list_professionals()
returns table (id uuid, full_name text, license_no text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.license_no from profiles p
  where app_is_active_user()
$$;
revoke execute on function list_professionals() from public, anon;
grant execute on function list_professionals() to authenticated;

-- Ocupación de puestos visible para todo usuario activo, SIN identidad del paciente.
-- Evita que una cama ocupada de otro sector se muestre como libre.
create or replace function location_status_map(p_sector uuid default null)
returns table (location_id uuid, occupied boolean, since timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, ba.id is not null, ba.started_at
  from locations l
  left join bed_assignments ba on ba.location_id = l.id and ba.ended_at is null
  where app_is_active_user() and (p_sector is null or l.sector_id = p_sector)
$$;
revoke execute on function location_status_map(uuid) from public, anon;
grant execute on function location_status_map(uuid) to authenticated;

-- Los pacientes no pueden pasar de ficticios a reales sin autorización institucional.
create or replace function trg_patient_fictitious_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_fictitious = false and old.is_fictitious = true and not coalesce(
       (select (value #>> '{}')::boolean from system_settings where key = 'allow_real_patient_data'), false) then
    raise exception 'El sistema no está autorizado para datos reales de pacientes.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger patient_fictitious_guard before update on patients
  for each row execute function trg_patient_fictitious_guard();
