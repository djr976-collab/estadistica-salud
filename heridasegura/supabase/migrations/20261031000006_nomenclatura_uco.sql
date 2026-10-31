-- =====================================================================
-- Migración 0006: nomenclatura institucional confirmada — Unidad Coronaria
-- Camas 1 a 9 (reemplaza los códigos provisorios UCO-C01 … UCO-C09).
-- Idempotente: solo renombra si el código sigue siendo el provisorio original
-- (no pisa cambios hechos desde Administración). Los registros clínicos no se
-- ven afectados porque referencian la ubicación por su identificador interno.
-- =====================================================================
update locations l
set code = g.i::text,
    label = 'Cama ' || g.i,
    is_provisional_code = false
from generate_series(1, 9) as g(i)
where l.seed_key = 'sec_uco:cama:' || g.i
  and l.code = 'UCO-C' || lpad(g.i::text, 2, '0');
