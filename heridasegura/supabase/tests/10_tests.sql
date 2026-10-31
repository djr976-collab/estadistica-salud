-- Pruebas de integridad, reglas clínicas y RLS (PostgreSQL local con stub de Supabase)
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect_error(p_sql text, p_like text)
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'SE ESPERABA ERROR y no ocurrió: %', p_sql;
exception when others then
  if sqlerrm like 'SE ESPERABA ERROR%' then raise; end if;
  if p_like is not null and sqlerrm not ilike '%' || p_like || '%' then
    raise exception 'Error inesperado para [%]: %', p_sql, sqlerrm;
  end if;
end $$;

create or replace function pg_temp.eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FALLÓ %: esperado %, obtenido %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end $$;

-- 1) Estructura hospitalaria -------------------------------------------------
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_cm_1'), 16, 'CM Sector 1: 16 camas');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_cm_2'), 24, 'CM Sector 2: 24 camas');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_cq_3'), 20, 'CQ Sector 3: 20 camas');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_cq_4'), 30, 'CQ Sector 4: 30 camas');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_s6'), 20, 'Sector 6: 20 camas');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_uti'), 18, 'UTI: 18 puestos');
select pg_temp.eq((select count(*) from locations where location_type = 'box_uti'), 5, 'UTI: 5 boxes');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_emg'), 16, 'Emergencias: 16 puestos');
select pg_temp.eq((select count(*) from locations where location_type = 'camilla'), 4, 'Emergencias: 4 camillas');
select pg_temp.eq((select count(*) from locations where location_type = 'shockroom'), 4, 'Emergencias: 4 shockroom');
select pg_temp.eq((select count(*) from locations where location_type = 'observacion'), 8, 'Emergencias: 8 observación');
select pg_temp.eq((select count(*) from locations l join sectors s on s.id = l.sector_id where s.seed_key = 'sec_uco'), 9, 'Unidad Coronaria: 9 camas');
select pg_temp.eq((select count(*) from locations), 153, 'Total 153 ubicaciones');
select pg_temp.eq((select count(*) from rooms r join sectors s on s.id = r.sector_id where s.seed_key = 'sec_cq_4' and r.code in ('36','37')), 0, 'Sector 4 sin habitaciones 36/37');
select pg_temp.eq((select count(*) from locations l join rooms r on r.id = l.room_id where r.seed_key = 'sec_cq_4:hab:30'), 3, 'Hab. 30: camas A, B, C');
select pg_temp.eq((select count(*) from locations l join rooms r on r.id = l.room_id where r.seed_key = 'sec_cq_4:hab:35'), 4, 'Hab. 35: camas A-D');
select pg_temp.eq((select count(*) from locations where code in ('16C','9A','27B','39B','610B','1A')), 6, 'Códigos extremos presentes');
select pg_temp.eq((select count(*) from bed_assignments ba join locations l on l.id = ba.location_id where l.seed_key = 'sec_cq_4:cama:30B' and ba.ended_at is null), 1, 'Paciente ficticio en CQ S4 hab. 30 cama B');

-- 2) Idempotencia y edición de códigos --------------------------------------
update locations set code = 'UTI-01' where seed_key = 'sec_uti:cama:1';
select seed_hospital_structure();
select pg_temp.eq((select count(*) from locations), 153, 'Re-ejecución no duplica');
select pg_temp.eq((select count(*) from locations where seed_key = 'sec_uti:cama:1' and code = 'UTI-01'), 1, 'Código editado se conserva');

-- 3) Usuarios ---------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'admin@demo.local', '{"full_name":"Admin Demo"}'),
  ('22222222-2222-4222-8222-222222222222', 'enf4@demo.local',  '{"full_name":"Enfermera Demo S4"}'),
  ('33333333-3333-4333-8333-333333333333', 'enf1@demo.local',  '{"full_name":"Enfermero Demo S1"}');
select pg_temp.eq((select count(*) from profiles where not active and role = 'enfermero'), 3, 'Perfiles nacen inactivos');
update profiles set active = true, role = 'admin' where id = '11111111-1111-4111-8111-111111111111';
update profiles set active = true where id in ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333');
insert into user_sectors select '22222222-2222-4222-8222-222222222222', id from sectors where seed_key = 'sec_cq_4';
insert into user_sectors select '33333333-3333-4333-8333-333333333333', id from sectors where seed_key = 'sec_cm_1';
insert into ai_models (id, name, version, provider, intended_use) values
  ('99999999-9999-4999-8999-999999999999', 'modelo-prueba', '0.0', 'ninguno', 'prueba de bloqueo');

-- 4) Como enfermera del Sector 4 -------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select pg_temp.eq((select count(*) from patients where mrn = 'DEMO-0001'), 1, 'RLS: ve paciente de su sector');
select pg_temp.eq((select count(*) from patients where mrn = 'DEMO-0003'), 0, 'RLS: no ve paciente de otro sector');
select pg_temp.eq((select count(*) from locations), 153, 'RLS: ve estructura completa');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = auth.uid()$$, 'administrador');
select pg_temp.expect_error($$insert into services (code, name) values ('X', 'X')$$, 'row-level security');
select pg_temp.eq((select count(*) from audit_logs), 0, 'RLS: enfermería no lee auditoría');

-- Paciente nuevo ficticio y admisión
insert into patients (id, mrn, first_name, last_name, created_by)
values ('00000000-0000-4000-8000-000000000999', 'DEMO-T1', 'Test', 'Ficticio', auth.uid());
select pg_temp.expect_error($$insert into patients (mrn, first_name, last_name, created_by, is_fictitious) values ('REAL-1','A','B', auth.uid(), false)$$, 'row-level security');
select pg_temp.expect_error($$select admit_patient('00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cq_4:cama:30B'))$$, 'ocupada');
select pg_temp.expect_error($$select admit_patient('00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cq_4:cama:30C'))$$, 'bloqueada');
select pg_temp.expect_error($$select admit_patient('00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cm_1:cama:1A'))$$, 'permisos');
select admit_patient('00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cq_4:cama:30A'), now() - interval '1 day', 'Diagnóstico ficticio');
select pg_temp.eq((select count(*) from admissions where patient_id = '00000000-0000-4000-8000-000000000999' and discharged_at is null), 1, 'Admisión creada');
select pg_temp.expect_error($$select admit_patient('00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cq_4:cama:31A'))$$, 'episodio');
select pg_temp.expect_error($$insert into bed_assignments (admission_id, patient_id, location_id, movement, started_at) values ((select id from admissions where patient_id = '00000000-0000-4000-8000-000000000999'), '00000000-0000-4000-8000-000000000999', (select id from locations where seed_key = 'sec_cq_4:cama:31A'), 'traslado', now())$$, 'row-level security');

-- 5) Lesiones y reglas de clasificación --------------------------------------
insert into wounds (id, patient_id, etiology, body_region, body_view, laterality, detected_at, present_on_admission, created_by)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', 'lesion_por_presion', 'Sacro', 'posterior', 'linea_media', now() - interval '2 day', 'no', auth.uid());
insert into wounds (id, patient_id, etiology, body_region, laterality, detected_at, present_on_admission, created_by)
values ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000101', 'quirurgica', 'Cadera', 'derecha', now() - interval '5 day', 'no', auth.uid());
select pg_temp.eq((select count(*) from wounds where admission_id = '00000000-0000-4000-8000-000000000201'), 2, 'Lesión vinculada al episodio activo');

select pg_temp.expect_error($$insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, evolution) values ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000101', now(), auth.uid(), 'estadio_2', true, 'primera_valoracion')$$, 'otra etiología');
select pg_temp.expect_error($$insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, blanching, evolution) values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now(), auth.uid(), 'estadio_1', true, 'no_evaluado', 'primera_valoracion')$$, 'blanqueable');
select pg_temp.expect_error($$insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, evolution) values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now(), auth.uid(), 'estadio_3', false, 'primera_valoracion')$$, 'confirmada');
select pg_temp.expect_error($$insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, evolution) values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now(), '33333333-3333-4333-8333-333333333333', 'primera_valoracion')$$, null);

insert into wound_assessments (id, wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, measurement_method, length_cm, width_cm, depth_cm, tissue_granulation_pct, tissue_slough_pct, evolution, next_assessment_due)
values ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now() - interval '2 day', auth.uid(), 'estadio_3', true, 'regla_milimetrada', 4, 3, 0.5, 60, 40, 'primera_valoracion', now() - interval '1 day');
select pg_temp.eq((select area_cm2::int from wound_assessments where id = '00000000-0000-4000-8000-000000000601'), 12, 'Superficie calculada largo x ancho');
select pg_temp.eq((select count(*) from wounds where id = '00000000-0000-4000-8000-000000000501' and initial_pu_category = 'estadio_3'), 1, 'Categoría inicial fijada');
select pg_temp.expect_error($$insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, evolution) values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now(), auth.uid(), 'estadio_2', true, 'mejoria')$$, 'estadificación inversa');
insert into wound_assessments (wound_id, patient_id, assessed_at, assessed_by, pu_category, classification_confirmed, measurement_method, length_cm, width_cm, evolution)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now(), auth.uid(), 'estadio_3', true, 'regla_milimetrada', 3, 2, 'mejoria');
reset role;  -- incluso con privilegios plenos, el trigger impide editar/eliminar
select pg_temp.expect_error($$update wound_assessments set observations = 'x' where id = '00000000-0000-4000-8000-000000000601'$$, null);
select pg_temp.expect_error($$delete from wound_assessments where id = '00000000-0000-4000-8000-000000000601'$$, null);
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select pg_temp.expect_error($$update wounds set current_pu_category = 'estadio_1' where id = '00000000-0000-4000-8000-000000000501'$$, 'no se modifican');
insert into assessment_addenda (assessment_id, author_id, reason, content)
values ('00000000-0000-4000-8000-000000000601', auth.uid(), 'Corrección de dato', 'La profundidad registrada corresponde a 0,4 cm.');
select pg_temp.eq((select count(*) from assessment_addenda), 1, 'Adenda registrada');

-- Braden
insert into braden_assessments (patient_id, assessed_at, assessed_by, sensory, moisture, activity, mobility, nutrition, friction)
values ('00000000-0000-4000-8000-000000000101', now(), auth.uid(), 2, 2, 1, 2, 2, 1);
select pg_temp.eq((select total from braden_assessments limit 1), 10, 'Braden total = suma de 6 dimensiones');
select pg_temp.expect_error($$insert into braden_assessments (patient_id, assessed_at, assessed_by, sensory, moisture, activity, mobility, nutrition, friction) values ('00000000-0000-4000-8000-000000000101', now(), auth.uid(), 2, 2, 1, 2, 2, 4)$$, 'check');

-- IA: inferencias de modelo no validado rechazadas
insert into wound_photos (id, wound_id, patient_id, storage_path, mime_type, size_bytes, taken_at, uploaded_by)
values ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000501/a.jpg', 'image/jpeg', 1000, now(), auth.uid());
reset role;
select pg_temp.expect_error($$insert into ai_assessments (photo_id, wound_id, patient_id, model_id, output, requested_by) values ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', '99999999-9999-4999-8999-999999999999', '{}', '22222222-2222-4222-8222-222222222222')$$, 'validación');

-- 6) Traslado: la lesión acompaña al paciente --------------------------------
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select move_patient('00000000-0000-4000-8000-000000000201', (select id from locations where seed_key = 'sec_cq_4:cama:31B'), 'cambio_cama');
select pg_temp.eq((select count(*) from bed_assignments where admission_id = '00000000-0000-4000-8000-000000000201'), 2, 'Historial de movimientos conservado');
select pg_temp.eq((select count(*) from location_occupancy where code = '30B' and display_status = 'libre'), 1, 'Cama 30B liberada');
select pg_temp.eq((select count(*) from wounds where patient_id = '00000000-0000-4000-8000-000000000101'), 2, 'Lesiones siguen al paciente');
select move_patient('00000000-0000-4000-8000-000000000201', (select id from locations where seed_key = 'sec_cq_4:cama:30B'), 'cambio_cama');

-- Storage: ruta debe corresponder a paciente/lesión accesibles
insert into storage.objects (bucket_id, name) values ('wound-photos', '00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000501/b.jpg');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('wound-photos', '00000000-0000-4000-8000-000000000103/00000000-0000-4000-8000-000000000501/c.jpg')$$, 'row-level security');

-- 7) Enfermero del Sector 1 no ve lesiones del Sector 4 ----------------------
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select pg_temp.eq((select count(*) from wounds), 0, 'RLS: lesiones de otro sector ocultas');
select pg_temp.eq((select count(*) from storage.objects), 0, 'RLS: fotos de otro sector ocultas');
select pg_temp.eq((select count(*) from patients where mrn = 'DEMO-0003'), 1, 'RLS: ve paciente de su sector (S1)');

-- 8) Auditoría sin valores clínicos ------------------------------------------
reset role;
select pg_temp.eq((select count(*) from audit_logs where table_name = 'wound_assessments' and action = 'INSERT'), 2, 'Auditoría de valoraciones');
select pg_temp.eq((select count(*) from audit_logs where context::text ilike '%sacro%'), 0, 'Auditoría sin datos clínicos');
select pg_temp.expect_error($$delete from audit_logs$$, null);
