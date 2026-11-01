\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','admin@x','{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-0000000000d1','doc1@x','{"full_name":"Docente Uno"}'),
 ('00000000-0000-0000-0000-0000000000d2','doc2@x','{"full_name":"Docente Dos"}'),
 ('00000000-0000-0000-0000-0000000000e1','est1@x','{"full_name":"Estudiante Uno"}'),
 ('00000000-0000-0000-0000-0000000000e2','est2@x','{"full_name":"Estudiante Dos"}');
select 'perfiles creados: ' || count(*) from public.profiles;
select 'progreso creado: ' || count(*) from public.progress;
-- bootstrap admin (como en el SQL Editor)
update public.profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a';

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
create or replace function pg_temp.expect_error(sql text, label text) returns text language plpgsql as $$
begin execute sql; return 'FALLA (no dio error): ' || label;
exception when others then return 'ok bloqueado: ' || label || ' → ' || sqlerrm; end $$;

-- ADMIN promueve docentes
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); set role authenticated;
select public.set_user_role('00000000-0000-0000-0000-0000000000d1','docente');
select public.set_user_role('00000000-0000-0000-0000-0000000000d2','docente');
select 'admin ve perfiles: ' || count(*) from public.profiles;
reset role;

-- ESTUDIANTE 1 intenta escalar privilegios
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1'); set role authenticated;
select pg_temp.expect_error($$update public.profiles set role='admin' where id=auth.uid()$$, 'auto-ascenso a admin');
select pg_temp.expect_error($$select public.set_user_role(auth.uid(),'docente')$$, 'set_user_role');
select pg_temp.expect_error($$select public.create_course('Hack')$$, 'crear curso');
select pg_temp.expect_error($$insert into public.questions(module_id,level,type,body) values ('x','basico','mcq','{}')$$, 'insertar pregunta');
update public.profiles set full_name='Estudiante Uno Editado' where id=auth.uid();
select 'nombre propio editable: ' || full_name from public.profiles where id=auth.uid();
reset role;

-- DOCENTES crean cursos
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1'); set role authenticated;
select join_code as code1 from public.create_course('Enfermería 1A', 2026) \gset
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2'); set role authenticated;
select join_code as code2 from public.create_course('Enfermería 2B', 2026) \gset
reset role;
select 'códigos: ' || :'code1' || ' / ' || :'code2';

-- Inscripción por código
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1'); set role authenticated;
select pg_temp.expect_error($$select public.join_course('ZZZZZZ')$$, 'código inválido');
select 'e1 inscripto en: ' || name from public.join_course(lower(:'code1'));
reset role; select id as c2 from public.courses where join_code=:'code2' \gset
set role authenticated;
select pg_temp.expect_error(format($$update public.profiles set course_id=%L where id=auth.uid()$$, :'c2'), 'cambio directo de curso ajeno');
insert into public.game_sessions (mode) values ('duelo') returning id as s1 \gset
insert into public.attempts (client_id, session_id, question_id, module_id, verdict, score, xp) values
 ('c1', :'s1', 'far-01', 'farmaco', 'correcta', 1, 15), ('c2', :'s1', 'far-02', 'farmaco', 'grave', 0, 0);
select pg_temp.expect_error($$insert into public.attempts (client_id, question_id, module_id, verdict, score) values ('c1','far-01','farmaco','correcta',1)$$, 'intento duplicado (sincronización)');
select pg_temp.expect_error($$insert into public.attempts (user_id, client_id, question_id, module_id, verdict, score) values ('00000000-0000-0000-0000-0000000000e2','zz','x','x','correcta',1)$$, 'intento a nombre de otro');
update public.progress set xp=15, badges='{primera}', wrong='{"far-02":1}' where user_id=auth.uid();
select 'e1 ve perfiles: ' || count(*) || ' | ve cursos: ' || (select count(*) from public.courses) from public.profiles;
select 'e1 ve progreso ajeno: ' || count(*) from public.progress where user_id <> auth.uid();
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2'); set role authenticated;
select 'e2 inscripto en: ' || name from public.join_course(:'code2');
insert into public.attempts (client_id, question_id, module_id, verdict, score) values ('k1','sv-01','signos','incorrecta',0);
select 'e2 ve intentos de e1: ' || count(*) from public.attempts where user_id='00000000-0000-0000-0000-0000000000e1';
reset role;

-- DOCENTE 1: ve sólo a su estudiante
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1'); set role authenticated;
select 'd1 resumen: ' || string_agg(full_name || ' xp=' || xp || ' pct=' || coalesce(pct::text,'-') || ' graves=' || grave_count, '; ') from public.student_summary;
select 'd1 módulos: ' || string_agg(module_id || ' ' || pct || '%', ', ') from public.module_stats;
select 'd1 ve intentos de e2: ' || count(*) from public.attempts where user_id='00000000-0000-0000-0000-0000000000e2';
update public.progress set xp=9999 where user_id='00000000-0000-0000-0000-0000000000e1';
select 'd1 no pudo alterar xp de e1: ' || (select xp from public.progress where user_id='00000000-0000-0000-0000-0000000000e1');
update public.courses set allow_spicy=false where join_code=:'code1';
update public.courses set allow_spicy=false where join_code=:'code2';
insert into public.questions(module_id,level,type,body,status) values ('casos','basico','mcq','{"prompt":"aprobada"}','aprobada'),('casos','basico','mcq','{"prompt":"borrador"}','borrador_ia');
insert into public.disabled_official(question_id) values ('sv-01');
select 'd1 ve preguntas (todas): ' || count(*) from public.questions;
reset role;
select 'spicy por curso: ' || string_agg(name || '=' || allow_spicy, ', ' order by name) from public.courses;

-- ESTUDIANTE: ve sólo aprobadas; cupo IA
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1'); set role authenticated;
select 'e1 ve preguntas: ' || count(*) || ' (' || string_agg(body->>'prompt', ',') || ')' from public.questions;
select 'e1 ve desactivadas: ' || count(*) from public.disabled_official;
select 'cupo IA (límite 2): ' || public.consume_ai_quota(2) || ',' || public.consume_ai_quota(2) || ',' || public.consume_ai_quota(2);
select 'e1 ve su curso: ' || name || ' spicy=' || allow_spicy from public.courses;
reset role;
-- anónimo no ve nada
set role anon; select pg_temp.expect_error($$select count(*) from public.profiles$$, 'anon lee perfiles'); reset role;
