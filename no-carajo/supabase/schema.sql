-- ¡NO, CARAJO! — Academia de Enfermería
-- Esquema de cuentas, cursos, roles, progreso, banco compartido y cupos de IA.
-- Uso: Supabase → SQL Editor → pegar y ejecutar UNA vez en un proyecto nuevo.
-- Después, convertir la primera cuenta en administradora (ver final del archivo).

-- ════════════════ Tipos ════════════════
create type public.user_role as enum ('admin', 'docente', 'estudiante');
create type public.question_status as enum ('borrador_ia', 'aprobada', 'archivada');

-- ════════════════ Tablas ════════════════
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 3 and 120),
  year int,
  join_code text not null unique,
  teacher_id uuid not null,
  allow_spicy boolean not null default true,   -- el docente activa/desactiva el modo +18 para su curso
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'estudiante',
  course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.courses
  add constraint courses_teacher_fk foreign key (teacher_id) references public.profiles(id) on delete cascade;

-- Progreso agregado del estudiante (XP, insignias, errores pendientes de Revancha).
create table public.progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp int not null default 0 check (xp >= 0),
  best_streak int not null default 0,
  sessions int not null default 0,
  grave_count int not null default 0,
  badges text[] not null default '{}',
  wrong jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  mode text not null,
  module_id text,
  level text,
  personality text,
  questions int,
  score numeric,
  xp int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.attempts (
  id bigint generated always as identity primary key,
  client_id text not null,                       -- id generado en el dispositivo: evita duplicados al sincronizar sin conexión
  session_id uuid references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  question_id text not null,                     -- ids del banco oficial ("far-01") o uuid del banco compartido
  module_id text not null,
  verdict text not null check (verdict in ('correcta','parcial','incorrecta','grave')),
  score numeric not null check (score between 0 and 1),
  xp int not null default 0,
  answer_text text check (length(answer_text) <= 500),
  graded_by text not null default 'local',
  answered_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index attempts_user_idx on public.attempts(user_id, answered_at desc);

-- Banco compartido: preguntas docentes, importadas y borradores de IA.
-- El banco oficial vive en el código (src/data); aquí se guardan los agregados y las desactivaciones.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  level text not null check (level in ('basico','intermedio','avanzado')),
  type text not null check (type in ('mcq','tf','open','calc')),
  body jsonb not null,                           -- objeto Question completo (enunciado, opciones, caso, crítico...)
  status public.question_status not null default 'aprobada',
  origin text not null default 'docente',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.disabled_official (
  question_id text primary key,
  disabled_by uuid references public.profiles(id) on delete set null default auth.uid(),
  disabled_at timestamptz not null default now()
);

create table public.ai_usage (
  day date not null default current_date,
  user_id uuid not null references public.profiles(id) on delete cascade,
  calls int not null default 0,
  primary key (day, user_id)
);

-- ════════════════ Funciones auxiliares (security definer evita recursión en RLS) ════════════════
create or replace function public.my_role() returns public.user_role
  language sql stable security definer set search_path = public
  as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public
  as $$ select coalesce(public.my_role() in ('docente','admin'), false) $$;

create or replace function public.my_course() returns uuid
  language sql stable security definer set search_path = public
  as $$ select course_id from public.profiles where id = auth.uid() $$;

-- ¿El usuario actual es docente del curso de ese estudiante (o admin)?
create or replace function public.teaches(student uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select public.my_role() = 'admin' or exists (
      select 1 from public.profiles s join public.courses c on c.id = s.course_id
      where s.id = student and c.teacher_id = auth.uid()
    )
  $$;

-- Alta automática del perfil al registrarse (siempre como estudiante).
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public
  as $$
  begin
    insert into public.profiles (id, full_name)
    values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120));
    insert into public.progress (user_id) values (new.id);
    return new;
  end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- El estudiante no puede cambiarse el rol ni el curso por update directo.
-- IMPORTANTE: SIN security definer, para que current_user sea quien hace el cambio.
create or replace function public.guard_profile_update() returns trigger
  language plpgsql set search_path = public
  as $$
  begin
    -- Las funciones security definer (join_course, set_user_role) y el SQL Editor corren como
    -- dueño de la base; sólo se controlan los cambios directos hechos por usuarios de la API.
    if current_user not in ('authenticated', 'anon') then
      return new;
    end if;
    if new.role is distinct from old.role and coalesce(public.my_role() <> 'admin', true) then
      raise exception 'Sólo un administrador puede cambiar roles';
    end if;
    if new.course_id is distinct from old.course_id and not public.teaches(old.id) then
      raise exception 'Para cambiar de curso usá un código de inscripción';
    end if;
    return new;
  end $$;

create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Inscripción a un curso mediante código.
create or replace function public.join_course(code text) returns public.courses
  language plpgsql security definer set search_path = public
  as $$
  declare c public.courses;
  begin
    select * into c from public.courses where join_code = upper(trim(code));
    if not found then raise exception 'Código de curso inválido'; end if;
    update public.profiles set course_id = c.id where id = auth.uid();
    return c;
  end $$;

-- Creación de curso (sólo docentes/admin) con código legible de 6 caracteres.
create or replace function public.create_course(course_name text, course_year int default null) returns public.courses
  language plpgsql security definer set search_path = public
  as $$
  declare c public.courses; code text;
  begin
    if not public.is_staff() then raise exception 'Sólo docentes pueden crear cursos'; end if;
    loop
      code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when length(code) = 6 and not exists (select 1 from public.courses where join_code = code);
    end loop;
    insert into public.courses (name, year, join_code, teacher_id)
      values (course_name, course_year, code, auth.uid()) returning * into c;
    return c;
  end $$;

-- Cambio de rol (sólo admin).
create or replace function public.set_user_role(target uuid, new_role public.user_role) returns void
  language plpgsql security definer set search_path = public
  as $$
  begin
    if coalesce(public.my_role() <> 'admin', true) then raise exception 'Sólo un administrador puede cambiar roles'; end if;
    update public.profiles set role = new_role where id = target;
  end $$;

-- Cupo diario de IA por usuario: devuelve true y descuenta si queda cupo.
create or replace function public.consume_ai_quota(daily_limit int) returns boolean
  language plpgsql security definer set search_path = public
  as $$
  declare used int;
  begin
    if auth.uid() is null then return false; end if;
    insert into public.ai_usage (day, user_id, calls) values (current_date, auth.uid(), 1)
      on conflict (day, user_id) do update set calls = ai_usage.calls + 1
      returning calls into used;
    return used <= daily_limit;
  end $$;

-- ════════════════ Seguridad por filas ════════════════
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.progress enable row level security;
alter table public.game_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.questions enable row level security;
alter table public.disabled_official enable row level security;
alter table public.ai_usage enable row level security;

-- Perfiles: cada uno ve el propio; el docente ve a sus estudiantes; admin ve todos.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches(id) or public.my_role() = 'admin');
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cursos: el docente ve los suyos; el estudiante ve el propio; admin ve todos.
create policy courses_select on public.courses for select to authenticated
  using (teacher_id = auth.uid() or id = public.my_course() or public.my_role() = 'admin');
create policy courses_update on public.courses for update to authenticated
  using (teacher_id = auth.uid() or public.my_role() = 'admin')
  with check (teacher_id = auth.uid() or public.my_role() = 'admin');
create policy courses_delete on public.courses for delete to authenticated
  using (teacher_id = auth.uid() or public.my_role() = 'admin');

-- Progreso, sesiones e intentos: privados del estudiante; visibles para su docente autorizado.
create policy progress_own on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_teacher on public.progress for select to authenticated using (public.teaches(user_id));

create policy sessions_own on public.game_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_teacher on public.game_sessions for select to authenticated using (public.teaches(user_id));

create policy attempts_insert_own on public.attempts for insert to authenticated with check (user_id = auth.uid());
create policy attempts_select_own on public.attempts for select to authenticated using (user_id = auth.uid());
create policy attempts_teacher on public.attempts for select to authenticated using (public.teaches(user_id));

-- Banco: todos los usuarios leen aprobadas; docentes/admin gestionan todo.
create policy questions_read on public.questions for select to authenticated
  using (status = 'aprobada' or public.is_staff());
create policy questions_staff_write on public.questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy disabled_read on public.disabled_official for select to authenticated using (true);
create policy disabled_staff on public.disabled_official for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy ai_usage_read on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.my_role() = 'admin');

-- ════════════════ Vistas para el tablero docente (respetan RLS del que consulta) ════════════════
create or replace view public.student_summary with (security_invoker = true) as
  select p.id as user_id, p.full_name, p.course_id,
         coalesce(pr.xp, 0) as xp, coalesce(pr.sessions, 0) as sessions,
         count(a.id) filter (where a.verdict = 'grave') as grave_count,
         count(a.id) as answers, round(avg(a.score) * 100) as pct,
         max(a.answered_at) as last_activity
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id
  left join public.attempts a on a.user_id = p.id
  where p.role = 'estudiante'
  group by p.id, p.full_name, p.course_id, pr.xp, pr.sessions;

create or replace view public.module_stats with (security_invoker = true) as
  select p.course_id, a.user_id, a.module_id, count(*) as answers, round(avg(a.score) * 100) as pct,
         count(*) filter (where a.verdict = 'grave') as grave_errors
  from public.attempts a join public.profiles p on p.id = a.user_id
  group by p.course_id, a.user_id, a.module_id;

grant select on public.student_summary, public.module_stats to authenticated;

-- ════════════════ Primer administrador ════════════════
-- 1) Registrate en la app con tu correo.  2) Ejecutá en el SQL Editor (cambiando el correo):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
