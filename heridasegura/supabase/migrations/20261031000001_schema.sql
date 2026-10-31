-- =====================================================================
-- HeridaSegura IA — Esquema principal
-- Migración 0001: tipos, tablas, restricciones e índices
--
-- Principios:
--  * La estructura física del hospital (servicios, sectores, habitaciones,
--    puestos) está separada de las asignaciones de pacientes.
--  * Las lesiones pertenecen al PACIENTE (no a la cama): el seguimiento
--    continúa ante traslados.
--  * Los registros clínicos confirmados no se eliminan ni se editan: las
--    correcciones se hacen mediante adendas trazables.
--  * La IA nunca confirma clasificaciones: solo un profesional autorizado.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type app_role as enum ('admin', 'supervisor', 'enfermero');

create type room_kind as enum ('habitacion', 'area');

create type location_type as enum (
  'cama_internacion',   -- cama física de sala general
  'cama_uti',           -- cama de terapia intensiva
  'box_uti',            -- box de terapia intensiva
  'cama_coronaria',     -- cama de unidad coronaria
  'shockroom',          -- puesto de shockroom (emergencias)
  'observacion',        -- puesto de observación (emergencias)
  'camilla'             -- camilla (emergencias) — NO es cama de internación
);

-- Estado operativo configurado por administración.
-- "Ocupada" NO se guarda: se deriva de la existencia de una asignación activa.
create type location_operational_status as enum ('disponible', 'bloqueada', 'fuera_servicio');

create type admission_status as enum ('internado', 'alta', 'traslado_externo', 'fallecimiento', 'otro');

create type movement_type as enum ('ingreso', 'traslado', 'cambio_cama');

create type wound_etiology as enum (
  'lesion_por_presion',
  'quirurgica',
  'dermatitis_humedad',     -- DAI / lesión cutánea asociada a la humedad
  'vascular_venosa',
  'vascular_arterial',
  'vascular_mixta',
  'pie_diabetico',
  'traumatica',
  'desgarro_cutaneo',
  'quemadura',
  'otra'
);

create type pu_category as enum (
  'estadio_1',
  'estadio_2',
  'estadio_3',
  'estadio_4',
  'no_clasificable',
  'tejido_profundo',
  'membrana_mucosa'         -- sin estadificación convencional
);

create type yes_no_unknown as enum ('si', 'no', 'desconocido');

create type laterality as enum ('derecha', 'izquierda', 'bilateral', 'linea_media', 'no_aplica');

create type body_view as enum ('anterior', 'posterior');

create type wound_status as enum ('activa', 'resuelta', 'derivada', 'cerrada_por_egreso');

create type assessment_evolution as enum (
  'primera_valoracion', 'mejoria', 'sin_cambios', 'empeoramiento', 'resuelta', 'derivada'
);

create type blanching_result as enum ('blanqueable', 'no_blanqueable', 'no_evaluado', 'no_aplica');

create type measurement_method as enum (
  'regla_milimetrada',      -- medición directa con regla descartable
  'foto_calibrada',         -- medición sobre fotografía con referencia de escala calibrada
  'no_medible'
);

create type exudate_amount as enum ('ninguno', 'escaso', 'moderado', 'abundante');

create type intervention_type as enum (
  'cambio_posicion',
  'proteccion_prominencias',
  'superficie_especial',
  'cuidado_piel',
  'manejo_humedad',
  'valoracion_nutricional',
  'derivacion_nutricion',
  'educacion_paciente_familia',
  'curacion',
  'manejo_dispositivo',
  'otra'
);

create type compliance_status as enum ('realizada', 'parcial', 'no_realizada');

create type ai_validation_status as enum ('no_validado', 'en_evaluacion', 'validado', 'retirado');

-- ---------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete restrict,
  full_name    text not null check (length(trim(full_name)) > 1),
  license_no   text,                       -- matrícula profesional
  role         app_role not null default 'enfermero',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Estructura física del hospital
-- seed_key: clave estable e inmutable usada por la carga inicial idempotente.
-- Los campos "code" y "name" pueden modificarse sin perder información clínica.
-- ---------------------------------------------------------------------
create table services (
  id          uuid primary key default gen_random_uuid(),
  seed_key    text unique,
  code        text not null unique,
  name        text not null,
  notes       text,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table sectors (
  id          uuid primary key default gen_random_uuid(),
  seed_key    text unique,
  service_id  uuid not null references services (id) on delete restrict,
  code        text not null unique,
  name        text not null,
  notes       text,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index sectors_service_idx on sectors (service_id);

create table rooms (
  id          uuid primary key default gen_random_uuid(),
  seed_key    text unique,
  sector_id   uuid not null references sectors (id) on delete restrict,
  code        text not null,
  name        text not null,
  kind        room_kind not null default 'habitacion',
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sector_id, code)
);
create index rooms_sector_idx on rooms (sector_id);

create table locations (
  id                  uuid primary key default gen_random_uuid(),
  seed_key            text unique,
  sector_id           uuid not null references sectors (id) on delete restrict,
  room_id             uuid references rooms (id) on delete restrict,
  code                text not null,
  label               text,                          -- ej. "Cama B"
  location_type       location_type not null,
  is_provisional_code boolean not null default false, -- nomenclatura a confirmar
  operational_status  location_operational_status not null default 'disponible',
  status_reason       text,
  sort_order          int not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Un código no puede repetirse dentro del mismo sector entre puestos activos.
create unique index locations_sector_code_active_uq on locations (sector_id, code) where active;
create index locations_room_idx on locations (room_id);
create index locations_sector_idx on locations (sector_id);

-- Indica si el puesto cuenta como cama de internación para indicadores.
create or replace function location_counts_as_bed(t location_type)
returns boolean language sql immutable as $$
  select t in ('cama_internacion', 'cama_uti', 'box_uti', 'cama_coronaria')
$$;

create table user_sectors (
  profile_id  uuid not null references profiles (id) on delete cascade,
  sector_id   uuid not null references sectors (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, sector_id)
);
create index user_sectors_sector_idx on user_sectors (sector_id);

-- ---------------------------------------------------------------------
-- Pacientes, episodios de internación y movimientos
-- ---------------------------------------------------------------------
create table patients (
  id             uuid primary key default gen_random_uuid(),
  mrn            text not null unique,           -- N.º de historia clínica
  first_name     text not null,
  last_name      text not null,
  birth_date     date check (birth_date is null or birth_date <= current_date),
  sex            text check (sex in ('femenino', 'masculino', 'otro', 'no_informado')),
  is_fictitious  boolean not null default true,   -- prototipo: solo datos ficticios
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index patients_name_idx on patients (lower(last_name), lower(first_name));

create table admissions (
  id                   uuid primary key default gen_random_uuid(),
  patient_id           uuid not null references patients (id) on delete restrict,
  admitted_at          timestamptz not null,
  admission_diagnosis  text,
  status               admission_status not null default 'internado',
  discharged_at        timestamptz,
  discharge_notes      text,
  created_by           uuid references profiles (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (discharged_at is null or discharged_at >= admitted_at),
  check ((status = 'internado') = (discharged_at is null))
);
-- Un paciente solo puede tener un episodio de internación abierto.
create unique index admissions_one_open_per_patient on admissions (patient_id) where discharged_at is null;
create index admissions_patient_idx on admissions (patient_id);

create table bed_assignments (
  id             uuid primary key default gen_random_uuid(),
  admission_id   uuid not null references admissions (id) on delete restrict,
  patient_id     uuid not null references patients (id) on delete restrict,
  location_id    uuid not null references locations (id) on delete restrict,
  movement       movement_type not null,
  started_at     timestamptz not null,
  ended_at       timestamptz,
  notes          text,
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
-- Impide dos pacientes simultáneos en un mismo puesto y dos puestos para un mismo episodio.
create unique index bed_assignments_one_active_per_location on bed_assignments (location_id) where ended_at is null;
create unique index bed_assignments_one_active_per_admission on bed_assignments (admission_id) where ended_at is null;
create index bed_assignments_patient_idx on bed_assignments (patient_id);
create index bed_assignments_location_idx on bed_assignments (location_id);

-- ---------------------------------------------------------------------
-- Lesiones
-- ---------------------------------------------------------------------
create sequence wound_code_seq;

create table wounds (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique default ('L-' || lpad(nextval('wound_code_seq')::text, 6, '0')),
  patient_id            uuid not null references patients (id) on delete restrict,
  admission_id          uuid references admissions (id) on delete restrict,
  etiology              wound_etiology not null,
  etiology_other        text,
  body_region           text not null,
  body_view             body_view,
  body_x                numeric(5,2) check (body_x between 0 and 100),
  body_y                numeric(5,2) check (body_y between 0 and 100),
  laterality            laterality not null default 'no_aplica',
  detected_at           timestamptz not null,
  present_on_admission  yes_no_unknown not null default 'desconocido',
  poa_source            text,                  -- fuente verificable del dato (registro de ingreso, etc.)
  device_related        boolean not null default false,
  device_description    text,
  initial_pu_category   pu_category,           -- se fija con la primera valoración confirmada
  current_pu_category   pu_category,           -- solo avanza; nunca estadificación inversa
  status                wound_status not null default 'activa',
  closed_at             timestamptz,
  closure_notes         text,
  closed_by             uuid references profiles (id),
  created_by            uuid references profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (etiology <> 'otra' or etiology_other is not null),
  check (etiology = 'lesion_por_presion' or (initial_pu_category is null and current_pu_category is null)),
  check (not device_related or device_description is not null),
  check ((status = 'activa') = (closed_at is null))
);
create index wounds_patient_idx on wounds (patient_id);
create index wounds_admission_idx on wounds (admission_id);
create index wounds_status_idx on wounds (status);

create table wound_assessments (
  id                    uuid primary key default gen_random_uuid(),
  wound_id              uuid not null references wounds (id) on delete restrict,
  patient_id            uuid not null references patients (id) on delete restrict,
  assessed_at           timestamptz not null,
  assessed_by           uuid not null references profiles (id),
  -- Clasificación LPP (solo para etiología LPP; confirmada por profesional)
  pu_category           pu_category,
  blanching             blanching_result not null default 'no_aplica',
  classification_confirmed boolean not null default false,
  -- Dimensiones
  measurement_method    measurement_method not null default 'no_medible',
  length_cm             numeric(6,2) check (length_cm  is null or length_cm  > 0),
  width_cm              numeric(6,2) check (width_cm   is null or width_cm   > 0),
  depth_cm              numeric(6,2) check (depth_cm   is null or depth_cm   >= 0),
  area_cm2              numeric(10,2) generated always as (length_cm * width_cm) stored,
  undermining_tunneling text,
  -- Lecho
  tissue_granulation_pct  smallint check (tissue_granulation_pct between 0 and 100),
  tissue_slough_pct       smallint check (tissue_slough_pct      between 0 and 100),
  tissue_necrosis_pct     smallint check (tissue_necrosis_pct    between 0 and 100),
  tissue_epithelial_pct   smallint check (tissue_epithelial_pct  between 0 and 100),
  tissue_other            text,
  edges                 text,
  exudate_amount        exudate_amount,
  exudate_type          text,
  odor                  text,
  periwound_skin        text,
  pain_score            smallint check (pain_score between 0 and 10),
  clinical_signs        text[] not null default '{}',
  evolution             assessment_evolution not null,
  observations          text,
  next_assessment_due   timestamptz,
  supervisor_reviewed_by uuid references profiles (id),
  supervisor_reviewed_at timestamptz,
  created_at            timestamptz not null default now(),
  check (coalesce(tissue_granulation_pct,0) + coalesce(tissue_slough_pct,0)
       + coalesce(tissue_necrosis_pct,0) + coalesce(tissue_epithelial_pct,0) <= 100),
  check (measurement_method <> 'no_medible' or (length_cm is null and width_cm is null and depth_cm is null)),
  -- El estadio 1 exige valoración presencial del blanqueamiento.
  check (pu_category is distinct from 'estadio_1' or blanching = 'no_blanqueable'),
  check (next_assessment_due is null or next_assessment_due > assessed_at)
);
create index wound_assessments_wound_idx on wound_assessments (wound_id, assessed_at);
create index wound_assessments_patient_idx on wound_assessments (patient_id);
create index wound_assessments_due_idx on wound_assessments (next_assessment_due);

-- Correcciones trazables: nunca se edita la valoración original.
create table assessment_addenda (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references wound_assessments (id) on delete restrict,
  author_id      uuid not null references profiles (id),
  reason         text not null check (length(trim(reason)) > 3),
  content        text not null check (length(trim(content)) > 3),
  created_at     timestamptz not null default now()
);
create index assessment_addenda_assessment_idx on assessment_addenda (assessment_id);

-- ---------------------------------------------------------------------
-- Fotografías (Storage privado; aquí solo metadatos)
-- ---------------------------------------------------------------------
create table wound_photos (
  id                    uuid primary key default gen_random_uuid(),
  wound_id              uuid not null references wounds (id) on delete restrict,
  patient_id            uuid not null references patients (id) on delete restrict,
  assessment_id         uuid references wound_assessments (id) on delete restrict,
  derived_from_id       uuid references wound_photos (id) on delete restrict, -- versión recortada/orientada
  storage_path          text not null unique,
  mime_type             text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes            int  not null check (size_bytes > 0 and size_bytes <= 15 * 1024 * 1024),
  width_px              int,
  height_px             int,
  sha256                text,
  taken_at              timestamptz not null,
  uploaded_by           uuid not null references profiles (id),
  body_region           text,
  quality               jsonb not null default '{}'::jsonb,  -- nitidez, brillo, resolución (heurísticas locales)
  has_scale_reference   boolean not null default false,
  px_per_cm             numeric(10,4) check (px_per_cm is null or px_per_cm > 0),
  identifiers_excluded  boolean not null default false,    -- el profesional declara que no hay rostro/pulsera/datos
  legal_basis           text,                              -- autorización / base legal registrada
  created_at            timestamptz not null default now(),
  check (px_per_cm is null or has_scale_reference)
);
create index wound_photos_wound_idx on wound_photos (wound_id, taken_at);

-- ---------------------------------------------------------------------
-- Escala de Braden
-- ---------------------------------------------------------------------
create table braden_assessments (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients (id) on delete restrict,
  admission_id   uuid references admissions (id) on delete restrict,
  assessed_at    timestamptz not null,
  assessed_by    uuid not null references profiles (id),
  sensory        smallint not null check (sensory   between 1 and 4),
  moisture       smallint not null check (moisture  between 1 and 4),
  activity       smallint not null check (activity  between 1 and 4),
  mobility       smallint not null check (mobility  between 1 and 4),
  nutrition      smallint not null check (nutrition between 1 and 4),
  friction       smallint not null check (friction  between 1 and 3),
  total          smallint generated always as (sensory + moisture + activity + mobility + nutrition + friction) stored,
  notes          text,
  created_at     timestamptz not null default now()
);
create index braden_patient_idx on braden_assessments (patient_id, assessed_at);

-- ---------------------------------------------------------------------
-- Intervenciones de enfermería
-- ---------------------------------------------------------------------
create table nursing_interventions (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references patients (id) on delete restrict,
  admission_id       uuid references admissions (id) on delete restrict,
  wound_id           uuid references wounds (id) on delete restrict,
  assessment_id      uuid references wound_assessments (id) on delete restrict,
  intervention       intervention_type not null,
  description        text,
  compliance         compliance_status not null default 'realizada',
  reason_not_done    text,
  performed_at       timestamptz not null,
  performed_by       uuid not null references profiles (id),
  created_at         timestamptz not null default now(),
  check (compliance = 'realizada' or reason_not_done is not null),
  check (intervention <> 'otra' or description is not null)
);
create index nursing_interventions_patient_idx on nursing_interventions (patient_id, performed_at);
create index nursing_interventions_wound_idx on nursing_interventions (wound_id);

-- ---------------------------------------------------------------------
-- Inteligencia artificial (preparado; sin modelo validado en el MVP)
-- ---------------------------------------------------------------------
create table ai_models (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  version            text not null,
  provider           text not null,
  intended_use       text not null,
  validation_status  ai_validation_status not null default 'no_validado',
  validation_ref     text,      -- referencia al informe de validación clínica/técnica
  approved_by        uuid references profiles (id),
  approved_at        timestamptz,
  processes_externally boolean not null default false,
  dpa_reference      text,      -- acuerdo de tratamiento de datos (si procesa fuera de la institución)
  created_at         timestamptz not null default now(),
  unique (name, version),
  check (validation_status <> 'validado' or (approved_by is not null and approved_at is not null and validation_ref is not null)),
  check (not processes_externally or validation_status <> 'validado' or dpa_reference is not null)
);

create table ai_assessments (
  id               uuid primary key default gen_random_uuid(),
  photo_id         uuid not null references wound_photos (id) on delete restrict,
  wound_id         uuid not null references wounds (id) on delete restrict,
  patient_id       uuid not null references patients (id) on delete restrict,
  model_id         uuid not null references ai_models (id) on delete restrict,
  output           jsonb not null,           -- inferencias del modelo (nunca clasificación confirmada)
  uncertainty_note text,
  requested_by     uuid not null references profiles (id),
  reviewed_by      uuid references profiles (id),
  review_decision  text check (review_decision in ('aceptada_parcial', 'rechazada', 'aceptada')),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index ai_assessments_photo_idx on ai_assessments (photo_id);

-- ---------------------------------------------------------------------
-- Auditoría y configuración
-- No se guardan valores clínicos en la auditoría (solo nombres de campos),
-- para no exponer información de salud en registros técnicos.
-- ---------------------------------------------------------------------
create table audit_logs (
  id              bigint generated always as identity primary key,
  occurred_at     timestamptz not null default now(),
  actor_id        uuid,
  action          text not null,           -- INSERT / UPDATE / DELETE / ACCESS / LOGIN / EXPORT ...
  table_name      text,
  record_id       text,
  changed_fields  text[],
  context         jsonb not null default '{}'::jsonb
);
create index audit_logs_time_idx on audit_logs (occurred_at desc);
create index audit_logs_record_idx on audit_logs (table_name, record_id);

create table system_settings (
  key          text primary key,
  value        jsonb not null,
  description  text,
  updated_by   uuid references profiles (id),
  updated_at   timestamptz not null default now()
);
