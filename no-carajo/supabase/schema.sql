-- ¡NO, CARAJO! — Academia de Enfermería
-- Esquema para la FASE 2 (cuentas, roles, banco compartido y estadísticas grupales).
-- Ejecutar en Supabase → SQL Editor. Revisar políticas con el área de sistemas antes de producción.

create type user_role as enum ('admin', 'docente', 'estudiante');
create type question_status as enum ('borrador_ia', 'en_revision', 'aprobada', 'archivada');

-- Perfiles (1 a 1 con auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role user_role not null default 'estudiante',
  course_id uuid,
  created_at timestamptz default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int,
  teacher_id uuid references public.profiles(id),
  allow_spicy boolean not null default true  -- el docente activa/desactiva el modo +18
);
alter table public.profiles add constraint profiles_course_fk foreign key (course_id) references public.courses(id);

create table public.modules (
  id text primary key,         -- 'bioseguridad', 'farmaco', ...
  number int not null,
  title text not null,
  unit text                    -- organización por unidades del programa
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id),
  level text not null check (level in ('basico','intermedio','avanzado')),
  type text not null check (type in ('mcq','tf','open','calc')),
  body jsonb not null,         -- prompt, options, answer, keyConcepts, calc, critical, caseId...
  explanation text not null,
  reference text,
  status question_status not null default 'en_revision',
  origin text not null default 'docente',
  created_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table public.bibliography (
  id uuid primary key default gen_random_uuid(),
  module_id text references public.modules(id),
  title text not null,
  content text not null,       -- fragmentos validados que se envían a la IA como fuente
  validated_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  module_id text,
  level text,
  personality text,
  score numeric,
  xp int default 0,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table public.attempts (
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id),
  verdict text not null check (verdict in ('correcta','parcial','incorrecta','grave')),
  score numeric not null,
  answer_text text,
  graded_by text not null default 'local',  -- 'local' | 'ia'
  created_at timestamptz default now()
);

create table public.ai_usage (
  day date not null,
  user_id uuid references public.profiles(id),
  calls int not null default 0,
  primary key (day, user_id)
);

-- ── Seguridad por filas ──
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.questions enable row level security;
alter table public.bibliography enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.ai_usage enable row level security;

create or replace function public.my_role() returns user_role
  language sql stable security definer set search_path = public
  as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.teaches(student uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (
      select 1 from public.profiles s join public.courses c on c.id = s.course_id
      where s.id = student and c.teacher_id = auth.uid()
    ) or public.my_role() = 'admin'
  $$;

-- Perfiles: cada uno ve el propio; docentes ven a sus estudiantes.
create policy "perfil propio" on public.profiles for select using (id = auth.uid() or public.teaches(id));
create policy "editar perfil propio" on public.profiles for update using (id = auth.uid()) with check (role = (select role from public.profiles where id = auth.uid()));

-- Banco: estudiantes sólo ven aprobadas; docentes/admin gestionan todo.
create policy "leer aprobadas" on public.questions for select using (status = 'aprobada' or public.my_role() in ('docente','admin'));
create policy "docentes gestionan" on public.questions for all using (public.my_role() in ('docente','admin')) with check (public.my_role() in ('docente','admin'));

create policy "leer bibliografía" on public.bibliography for select using (public.my_role() in ('docente','admin'));
create policy "docentes bibliografía" on public.bibliography for all using (public.my_role() in ('docente','admin'));

create policy "leer cursos" on public.courses for select using (true);
create policy "docente edita su curso" on public.courses for update using (teacher_id = auth.uid() or public.my_role() = 'admin');

-- Resultados: privados del estudiante, visibles para su docente autorizado.
create policy "sesiones propias" on public.sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "docente ve sesiones" on public.sessions for select using (public.teaches(user_id));
create policy "intentos propios" on public.attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "docente ve intentos" on public.attempts for select using (public.teaches(user_id));
create policy "uso IA propio" on public.ai_usage for select using (user_id = auth.uid() or public.my_role() = 'admin');

-- Vista para estadísticas grupales por módulo
create or replace view public.course_module_stats with (security_invoker = true) as
  select p.course_id, q.module_id, count(*) as answers, avg(a.score) as avg_score,
         count(*) filter (where a.verdict = 'grave') as grave_errors
  from public.attempts a
  join public.profiles p on p.id = a.user_id
  join public.questions q on q.id = a.question_id
  group by p.course_id, q.module_id;
