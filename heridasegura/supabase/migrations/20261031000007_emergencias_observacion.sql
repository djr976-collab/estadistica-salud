-- =====================================================================
-- Migración 0007: Emergencias — las 4 camillas (ex camas COVID) pasan a ser
-- puestos de OBSERVACIÓN 9 a 12. Resultado: 4 shockroom + 12 observación.
-- * Conserva el identificador y la clave interna (seed_key) de cada puesto:
--   cualquier movimiento registrado sigue vinculado.
-- * Idempotente: solo convierte puestos que mantienen el código provisorio
--   original (no pisa cambios hechos desde Administración).
-- * El área "Camillas" se desactiva (no se elimina) si queda sin puestos activos.
-- * El tipo 'camilla' se mantiene disponible para uso futuro.
-- =====================================================================
update locations l
set location_type = 'observacion',
    room_id = (select id from rooms where seed_key = 'sec_emg:area:obs'),
    code = 'EMG-OBS-' || lpad((g.i + 8)::text, 2, '0'),
    label = 'Puesto observación ' || (g.i + 8),
    sort_order = g.i + 8
from generate_series(1, 4) as g(i)
where l.seed_key = 'sec_emg:cam:' || g.i
  and l.location_type = 'camilla'
  and l.code = 'EMG-CAM-' || lpad(g.i::text, 2, '0');

update rooms r set active = false
where r.seed_key = 'sec_emg:area:cam' and r.active
  and not exists (select 1 from locations l where l.room_id = r.id and l.active);
