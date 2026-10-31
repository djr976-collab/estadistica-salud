-- =====================================================================
-- Datos de DEMOSTRACIÓN — EXCLUSIVAMENTE FICTICIOS
-- No corresponden a personas reales. Idempotente (UUID fijos).
-- Ejecutar solo en entornos de prueba / demostración.
-- =====================================================================

select seed_hospital_structure();  -- garantiza la estructura (idempotente)

insert into patients (id, mrn, first_name, last_name, birth_date, sex, is_fictitious) values
  ('00000000-0000-4000-8000-000000000101', 'DEMO-0001', 'Rosa',     'Ficticia Gómez',   '1948-03-12', 'femenino',  true),
  ('00000000-0000-4000-8000-000000000102', 'DEMO-0002', 'Ernesto',  'Ejemplo Duarte',   '1956-07-30', 'masculino', true),
  ('00000000-0000-4000-8000-000000000103', 'DEMO-0003', 'Marta',    'Prueba Insaurralde','1939-11-02', 'femenino', true),
  ('00000000-0000-4000-8000-000000000104', 'DEMO-0004', 'Julio',    'Simulado Benítez', '1972-01-19', 'masculino', true),
  ('00000000-0000-4000-8000-000000000105', 'DEMO-0005', 'Teresa',   'Demo Acosta',      '1965-05-25', 'femenino',  true),
  ('00000000-0000-4000-8000-000000000106', 'DEMO-0006', 'Ramón',    'Ficticio Sosa',    '1951-09-08', 'masculino', true),
  ('00000000-0000-4000-8000-000000000107', 'DEMO-0007', 'Elsa',     'Ejemplar Romero',  '1944-12-14', 'femenino',  true),
  ('00000000-0000-4000-8000-000000000108', 'DEMO-0008', 'Carlos',   'Muestra Vallejos', '1980-04-03', 'masculino', true)
on conflict (id) do nothing;

-- Episodios de internación y camas (requisito: CQ Sector 4, habitación 30, cama B)
with demo(adm_id, patient_id, seed_key, days_ago, dx) as (values
  ('00000000-0000-4000-8000-000000000201'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, 'sec_cq_4:cama:30B', 6, 'Postoperatorio de fractura de cadera (ficticio)'),
  ('00000000-0000-4000-8000-000000000202'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, 'sec_cq_4:cama:28A', 3, 'Apendicectomía (ficticio)'),
  ('00000000-0000-4000-8000-000000000203'::uuid, '00000000-0000-4000-8000-000000000103'::uuid, 'sec_cm_1:cama:2B',  10, 'Neumonía (ficticio)'),
  ('00000000-0000-4000-8000-000000000204'::uuid, '00000000-0000-4000-8000-000000000104'::uuid, 'sec_cq_3:cama:21A', 2, 'Colecistectomía (ficticio)'),
  ('00000000-0000-4000-8000-000000000205'::uuid, '00000000-0000-4000-8000-000000000105'::uuid, 'sec_s6:cama:603A',  4, 'Diagnóstico de ingreso ficticio'),
  ('00000000-0000-4000-8000-000000000206'::uuid, '00000000-0000-4000-8000-000000000106'::uuid, 'sec_uti:cama:4',    8, 'Sepsis (ficticio)'),
  ('00000000-0000-4000-8000-000000000207'::uuid, '00000000-0000-4000-8000-000000000107'::uuid, 'sec_cm_2:cama:12C', 15, 'Insuficiencia cardíaca (ficticio)')
)
, ins_adm as (
  insert into admissions (id, patient_id, admitted_at, admission_diagnosis)
  select adm_id, patient_id, now() - make_interval(days => days_ago), dx from demo
  on conflict (id) do nothing
  returning id
)
insert into bed_assignments (admission_id, patient_id, location_id, movement, started_at)
select d.adm_id, d.patient_id, l.id, 'ingreso', now() - make_interval(days => d.days_ago)
from demo d
join locations l on l.seed_key = d.seed_key
where exists (select 1 from ins_adm a where a.id = d.adm_id);

-- Bloqueo de ejemplo
update locations set operational_status = 'bloqueada', status_reason = 'Demostración: aislamiento / limpieza terminal'
where seed_key = 'sec_cq_4:cama:30C' and operational_status = 'disponible';
