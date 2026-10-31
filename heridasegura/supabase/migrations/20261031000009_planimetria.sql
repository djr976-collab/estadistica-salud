-- =====================================================================
-- Migración 0009: planimetría por trazado sobre fotografía calibrada (Fase 2)
-- Solo se admite superficie trazada si la foto tiene calibración (px_per_cm).
-- =====================================================================
alter table wound_photos
  add column if not exists traced_area_cm2 numeric(10,2) check (traced_area_cm2 is null or traced_area_cm2 > 0),
  add column if not exists trace_polygon jsonb;

alter table wound_photos drop constraint if exists wound_photos_trace_requires_calibration;
alter table wound_photos add constraint wound_photos_trace_requires_calibration
  check ((traced_area_cm2 is null and trace_polygon is null)
         or (px_per_cm is not null and traced_area_cm2 is not null
             and jsonb_typeof(trace_polygon) = 'array' and jsonb_array_length(trace_polygon) >= 3));
