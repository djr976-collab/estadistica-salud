-- =====================================================================
-- Migración 0008: Emergencias — se RESTITUYEN 4 camillas (siguen existiendo).
-- Los puestos ex-COVID quedan como observación 9 a 12 (migración 0007).
-- Resultado: 4 shockroom + 12 observación + 4 camillas = 20 puestos.
-- Idempotente (seed_key nuevos 'sec_emg:camilla:N'); no pisa cambios de administración.
-- =====================================================================
update rooms set active = true where seed_key = 'sec_emg:area:cam' and not active;

insert into locations (seed_key, sector_id, room_id, code, label, location_type, is_provisional_code, sort_order)
select 'sec_emg:camilla:' || g.i, s.id, r.id, 'EMG-CAM-' || lpad(g.i::text, 2, '0'), 'Camilla ' || g.i, 'camilla', true, g.i
from generate_series(1, 4) as g(i)
join sectors s on s.seed_key = 'sec_emg'
join rooms r on r.seed_key = 'sec_emg:area:cam'
on conflict (seed_key) do nothing;
