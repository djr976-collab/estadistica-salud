-- =====================================================================
-- Migración 0004: carga inicial IDEMPOTENTE de la estructura hospitalaria
-- Hospital Escuela General José Francisco de San Martín — Corrientes
--
-- * Usa seed_key estable: ejecutarla de nuevo no duplica registros ni
--   sobrescribe códigos o nombres modificados desde administración.
-- * No crea pacientes.
-- * Códigos marcados como provisionales (is_provisional_code) en UTI,
--   Emergencias y Unidad Coronaria hasta confirmar la nomenclatura real.
-- =====================================================================

create or replace function seed_hospital_structure()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_service uuid;
  v_sector uuid;
  v_room uuid;
  v_bed text;
  i int;
  n_order int;
begin
  -- ---------------- Configuración general ----------------
  insert into system_settings (key, value, description) values
    ('hospital_name', to_jsonb('Hospital Escuela General José Francisco de San Martín'::text), 'Nombre de la institución'),
    ('hospital_city', to_jsonb('Corrientes, Argentina'::text), 'Localidad'),
    ('allow_real_patient_data', 'false'::jsonb, 'Habilitar datos reales SOLO tras evaluación y autorización institucional'),
    ('ai_assistance_enabled', 'false'::jsonb, 'Asistencia de IA: requiere un modelo con validación aprobada'),
    ('braden_validity_hours', '24'::jsonb, 'Vigencia de una valoración de Braden (ajustar a protocolo institucional)'),
    ('default_reassessment_hours', '72'::jsonb, 'Intervalo sugerido de reevaluación de heridas (ajustar a protocolo)'),
    ('signed_url_seconds', '60'::jsonb, 'Duración de las URL firmadas de fotografías'),
    ('photo_legal_basis', to_jsonb('Registro clínico — Ley 26.529 (historia clínica) y Ley 25.326 (datos personales). Verificar con el área legal institucional.'::text), 'Base legal registrada para fotografías clínicas')
  on conflict (key) do nothing;

  -- ---------------- Servicios ----------------
  insert into services (seed_key, code, name, notes, sort_order) values
    ('svc_clinica_medica',    'CM',  'Clínica Médica', null, 10),
    ('svc_clinica_quirurgica','CQ',  'Clínica Quirúrgica', null, 20),
    ('svc_sector_6',          'S6',  'Sector 6', 'Especialidad no confirmada: se conserva la denominación "Sector 6".', 30),
    ('svc_uti',               'UTI', 'Unidad de Terapia Intensiva', null, 40),
    ('svc_emergencias',       'EMG', 'Servicio de Emergencias', null, 50),
    ('svc_unidad_coronaria',  'UCO', 'Unidad Coronaria', null, 60)
  on conflict (seed_key) do nothing;

  -- ---------------- Sectores ----------------
  insert into sectors (seed_key, service_id, code, name, sort_order)
  select v.seed_key, s.id, v.code, v.name, v.sort_order
  from (values
    ('sec_cm_1',  'svc_clinica_medica',     'CM-S1', 'Clínica Médica — Sector 1', 11),
    ('sec_cm_2',  'svc_clinica_medica',     'CM-S2', 'Clínica Médica — Sector 2', 12),
    ('sec_cq_3',  'svc_clinica_quirurgica', 'CQ-S3', 'Clínica Quirúrgica — Sector 3', 21),
    ('sec_cq_4',  'svc_clinica_quirurgica', 'CQ-S4', 'Clínica Quirúrgica — Sector 4', 22),
    ('sec_s6',    'svc_sector_6',           'S6',    'Sector 6', 31),
    ('sec_uti',   'svc_uti',                'UTI',   'Unidad de Terapia Intensiva', 41),
    ('sec_emg',   'svc_emergencias',        'EMG',   'Emergencias', 51),
    ('sec_uco',   'svc_unidad_coronaria',   'UCO',   'Unidad Coronaria', 61)
  ) as v(seed_key, service_key, code, name, sort_order)
  join services s on s.seed_key = v.service_key
  on conflict (seed_key) do nothing;

  -- ---------------- Habitaciones con camas de internación ----------------
  -- (sector, habitación, camas)
  for r in
    select * from (
      select 'sec_cm_1' as sk, g::text as room, array['A','B'] as beds from generate_series(1, 8) g
      union all
      select 'sec_cm_2', g::text, array['A','B','C'] from generate_series(9, 16) g
      union all
      select 'sec_cq_3', g::text, array['A','B'] from generate_series(18, 27) g
      union all
      select 'sec_cq_4', g::text, array['A','B','C'] from generate_series(28, 33) g
      union all
      select 'sec_cq_4', g::text, array['A','B','C','D'] from unnest(array[34, 35]) g
      union all
      select 'sec_cq_4', g::text, array['A','B'] from unnest(array[38, 39]) g
      union all
      select 'sec_s6', g::text, array['A','B'] from generate_series(601, 610) g
    ) t
  loop
    select id into v_sector from sectors where seed_key = r.sk;
    insert into rooms (seed_key, sector_id, code, name, kind, sort_order)
    values (r.sk || ':hab:' || r.room, v_sector, r.room, 'Habitación ' || r.room, 'habitacion', r.room::int)
    on conflict (seed_key) do nothing;
    select id into v_room from rooms where seed_key = r.sk || ':hab:' || r.room;

    n_order := 0;
    foreach v_bed in array r.beds loop
      n_order := n_order + 1;
      insert into locations (seed_key, sector_id, room_id, code, label, location_type, sort_order)
      values (r.sk || ':cama:' || r.room || v_bed, v_sector, v_room, r.room || v_bed, 'Cama ' || v_bed,
              'cama_internacion', r.room::int * 10 + n_order)
      on conflict (seed_key) do nothing;
    end loop;
  end loop;

  -- ---------------- UTI: 13 camas + 5 boxes (códigos provisionales) ----------------
  select id into v_sector from sectors where seed_key = 'sec_uti';
  insert into rooms (seed_key, sector_id, code, name, kind, sort_order) values
    ('sec_uti:area:camas', v_sector, 'CAMAS', 'Camas de terapia intensiva', 'area', 1),
    ('sec_uti:area:boxes', v_sector, 'BOXES', 'Boxes', 'area', 2)
  on conflict (seed_key) do nothing;

  select id into v_room from rooms where seed_key = 'sec_uti:area:camas';
  for i in 1..13 loop
    insert into locations (seed_key, sector_id, room_id, code, label, location_type, is_provisional_code, sort_order)
    values ('sec_uti:cama:' || i, v_sector, v_room, 'UTI-C' || lpad(i::text, 2, '0'), 'Cama ' || i, 'cama_uti', true, i)
    on conflict (seed_key) do nothing;
  end loop;
  select id into v_room from rooms where seed_key = 'sec_uti:area:boxes';
  for i in 1..5 loop
    insert into locations (seed_key, sector_id, room_id, code, label, location_type, is_provisional_code, sort_order)
    values ('sec_uti:box:' || i, v_sector, v_room, 'UTI-BOX' || lpad(i::text, 2, '0'), 'Box ' || i, 'box_uti', true, 100 + i)
    on conflict (seed_key) do nothing;
  end loop;

  -- ---------------- Emergencias: shockroom 4, observación 8, camillas 4 ----------------
  select id into v_sector from sectors where seed_key = 'sec_emg';
  insert into rooms (seed_key, sector_id, code, name, kind, sort_order) values
    ('sec_emg:area:shock', v_sector, 'SHOCKROOM',  'Shockroom', 'area', 1),
    ('sec_emg:area:obs',   v_sector, 'OBSERVACION','Observación', 'area', 2),
    ('sec_emg:area:cam',   v_sector, 'CAMILLAS',   'Camillas', 'area', 3)
  on conflict (seed_key) do nothing;

  for r in select * from (values
      ('sec_emg:area:shock', 'shock', 'SHK-', 4, 'shockroom'::location_type, 'Puesto shockroom '),
      ('sec_emg:area:obs',   'obs',   'OBS-', 8, 'observacion'::location_type, 'Puesto observación '),
      ('sec_emg:area:cam',   'cam',   'CAM-', 4, 'camilla'::location_type, 'Camilla ')
    ) as t(room_key, k, prefix, n, ltype, lbl)
  loop
    select id into v_room from rooms where seed_key = r.room_key;
    for i in 1..r.n loop
      insert into locations (seed_key, sector_id, room_id, code, label, location_type, is_provisional_code, sort_order)
      values ('sec_emg:' || r.k || ':' || i, v_sector, v_room, 'EMG-' || r.prefix || lpad(i::text, 2, '0'),
              r.lbl || i, r.ltype, true, i)
      on conflict (seed_key) do nothing;
    end loop;
  end loop;

  -- ---------------- Unidad Coronaria: 9 camas (códigos provisionales) ----------------
  select id into v_sector from sectors where seed_key = 'sec_uco';
  insert into rooms (seed_key, sector_id, code, name, kind, sort_order) values
    ('sec_uco:area:camas', v_sector, 'CAMAS', 'Camas de unidad coronaria', 'area', 1)
  on conflict (seed_key) do nothing;
  select id into v_room from rooms where seed_key = 'sec_uco:area:camas';
  for i in 1..9 loop
    insert into locations (seed_key, sector_id, room_id, code, label, location_type, is_provisional_code, sort_order)
    values ('sec_uco:cama:' || i, v_sector, v_room, 'UCO-C' || lpad(i::text, 2, '0'), 'Cama ' || i, 'cama_coronaria', true, i)
    on conflict (seed_key) do nothing;
  end loop;
end $$;

revoke execute on function seed_hospital_structure() from public, anon, authenticated;

select seed_hospital_structure();
